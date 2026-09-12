/**
 * Fila global de concorrência para auditorias.
 *
 * Cada auditoria sobe uma instância do Chromium via Puppeteer (YellowLabTools).
 * Sem um limite global, disparos manuais ("Analisar" em várias URLs seguidas) e
 * lotes de domínios diferentes podiam somar Chromiums abertos ao mesmo tempo sem
 * nenhum controle, travando o container na máquina do próprio dev.
 *
 * `runQueued` garante que no máximo MAX_CONCURRENT_AUDITS auditorias rodem de
 * fato em paralelo — as demais aguardam a vez em uma fila FIFO simples,
 * independente de terem sido disparadas via rota individual ou em lote.
 *
 * Padrão = 1 (totalmente serializado). Testamos MAX_CONCURRENT_AUDITS=2 num
 * ambiente Docker/WSL2 local e o Chromium ficou instável com 2 auditorias
 * reais rodando ao mesmo tempo (erros "Target closed" / "Protocol error"
 * mesmo com o timeout já em 90s) — ou seja, o container não aguenta 2
 * instâncias simultâneas de forma confiável neste tipo de máquina. Se sua
 * máquina tiver CPU/memória de sobra, pode tentar aumentar via env var.
 */

const MAX_CONCURRENT_AUDITS = Number(process.env.MAX_CONCURRENT_AUDITS) || 1;

let running = 0;
const waiters: Array<() => void> = [];

function acquire(): Promise<void> {
  if (running < MAX_CONCURRENT_AUDITS) {
    running++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(() => {
      running++;
      resolve();
    });
  });
}

function release(): void {
  running--;
  const next = waiters.shift();
  if (next) next();
}

export async function runQueued<T>(task: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await task();
  } finally {
    release();
  }
}

export function getAuditQueueStats() {
  return {
    running,
    waiting: waiters.length,
    max: MAX_CONCURRENT_AUDITS,
  };
}
