// @ts-ignore
const yellowlabtools = require('yellowlabtools');

export interface YltRunResult {
  success: boolean;
  score?: number;
  pageWeightScore?: number | null;
  requestsScore?: number | null;
  domScore?: number | null;
  jsScore?: number | null;
  cssScore?: number | null;
  serverConfigScore?: number | null;
  reportJson?: any;
  durationMs?: number;
  error?: string;
  attempts?: number;
}

// Falhas transitórias (rede, crash pontual do Chromium) valem retry; erros de
// configuração/uso não mudam de resultado numa nova tentativa, então não vale
// a pena gastar mais 90s+ tentando de novo.
const parsedMaxRetries = Number(process.env.AUDIT_MAX_RETRIES);
const MAX_RETRIES = Math.max(0, Number.isFinite(parsedMaxRetries) ? parsedMaxRetries : 1);
const RETRY_DELAY_MS = Math.max(0, Number(process.env.AUDIT_RETRY_DELAY_MS) || 3000);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runOnce(url: string, yltDevice: string): Promise<YltRunResult> {
  const startTime = Date.now();

  const results = await yellowlabtools(url, {
    device: yltDevice,
    timeout: 90,
    waitForNetworkIdle: false,
  });

  const durationMs = Date.now() - startTime;

  if (!results || !results.scoreProfiles || !results.scoreProfiles.generic) {
    return {
      success: false,
      durationMs,
      error: 'A ferramenta YellowLabTools não retornou perfis de score válidos.',
    };
  }

  const profile = results.scoreProfiles.generic;

  return {
    success: true,
    score: profile.globalScore,
    pageWeightScore: profile.categories.pageWeight?.categoryScore ?? null,
    requestsScore: profile.categories.requests?.categoryScore ?? null,
    domScore: profile.categories.domComplexity?.categoryScore ?? null,
    jsScore: profile.categories.javascriptComplexity?.categoryScore ?? null,
    cssScore: profile.categories.cssComplexity?.categoryScore ?? null,
    serverConfigScore: profile.categories.serverConfig?.categoryScore ?? null,
    reportJson: results,
    durationMs,
  };
}

export async function runYellowLabAudit(
  url: string,
  device: 'mobile' | 'desktop' = 'mobile'
): Promise<YltRunResult> {
  const overallStart = Date.now();
  console.log(`[YLT Runner] Iniciando auditoria para ${url} (device: ${device})...`);

  // Garante os caminhos para o Chromium headless com flags no-sandbox
  process.env.PHANTOMAS_CHROMIUM_EXECUTABLE =
    process.env.PHANTOMAS_CHROMIUM_EXECUTABLE || '/usr/local/bin/chromium-no-sandbox';
  process.env.PUPPETEER_EXECUTABLE_PATH =
    process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';

  // YellowLabTools mapeia mobile como 'phone'
  const yltDevice = device === 'mobile' ? 'phone' : device;

  let lastResult: YltRunResult | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const result = await runOnce(url, yltDevice);

      if (result.success) {
        console.log(
          `[YLT Runner] Auditoria concluída com sucesso para ${url} em ${result.durationMs}ms` +
            (attempt > 1 ? ` (tentativa ${attempt}/${MAX_RETRIES + 1})` : '') +
            `. Score: ${result.score}`
        );
        return { ...result, attempts: attempt, durationMs: Date.now() - overallStart };
      }

      lastResult = result;
      console.error(
        `[YLT Runner] Falha (tentativa ${attempt}/${MAX_RETRIES + 1}) ao auditar ${url}: ${result.error}`
      );
    } catch (err: any) {
      lastResult = { success: false, error: String(err.message || err) };
      console.error(
        `[YLT Runner] Falha (tentativa ${attempt}/${MAX_RETRIES + 1}) ao auditar ${url}:`,
        err.message || err
      );
    }

    const hasMoreAttempts = attempt <= MAX_RETRIES;
    if (hasMoreAttempts) {
      console.log(`[YLT Runner] Nova tentativa em ${RETRY_DELAY_MS}ms para ${url}...`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  return {
    success: false,
    durationMs: Date.now() - overallStart,
    error: lastResult?.error || 'Falha desconhecida durante auditoria',
    attempts: MAX_RETRIES + 1,
  };
}
