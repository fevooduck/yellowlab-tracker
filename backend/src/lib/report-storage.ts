import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * O JSON completo de cada auditoria (`scoreProfiles`, `rules`, ofensores etc.)
 * pode passar de alguns MB. Guardar isso direto no Postgres (coluna
 * `reportJson`) fazia o banco crescer sem controle em uso contínuo. Aqui ele
 * vai para arquivos locais em disco — fora do volume do banco — e o Postgres
 * guarda só o caminho (`YellowLabReport.reportPath`) e os scores resumidos.
 *
 * Por padrão usa `<raiz do projeto>/ylt_reports` (já previsto no .gitignore).
 * Como o docker-compose faz bind mount do projeto inteiro (`.:/app`), o que é
 * escrito aqui persiste no host normalmente, do mesmo jeito que o código-fonte.
 */
const REPORTS_DIR = process.env.REPORTS_DIR || path.join(process.cwd(), '..', 'ylt_reports');

async function ensureUrlDir(urlId: number): Promise<string> {
  const dir = path.join(REPORTS_DIR, `url-${urlId}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Salva o JSON de uma auditoria em disco e retorna o caminho relativo (a guardar em `reportPath`). */
export async function saveReportJson(urlId: number, data: any): Promise<string> {
  await ensureUrlDir(urlId);
  const fileName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`;
  const relativePath = path.join(`url-${urlId}`, fileName);
  await fs.writeFile(path.join(REPORTS_DIR, relativePath), JSON.stringify(data), 'utf-8');
  return relativePath;
}

/** Lê de volta o JSON de uma auditoria a partir do caminho relativo salvo no banco. */
export async function readReportJson(relativePath: string): Promise<any> {
  const content = await fs.readFile(path.join(REPORTS_DIR, relativePath), 'utf-8');
  return JSON.parse(content);
}

/** Remove todos os relatórios em disco de uma URL (usado ao excluir a URL ou o domínio inteiro). */
export async function deleteReportsForUrl(urlId: number): Promise<void> {
  await fs.rm(path.join(REPORTS_DIR, `url-${urlId}`), { recursive: true, force: true });
}
