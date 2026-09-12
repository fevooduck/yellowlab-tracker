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
}

export async function runYellowLabAudit(
  url: string,
  device: 'mobile' | 'desktop' = 'mobile'
): Promise<YltRunResult> {
  const startTime = Date.now();
  console.log(`[YLT Runner] Iniciando auditoria para ${url} (device: ${device})...`);

  // Garante os caminhos para o Chromium headless com flags no-sandbox
  process.env.PHANTOMAS_CHROMIUM_EXECUTABLE =
    process.env.PHANTOMAS_CHROMIUM_EXECUTABLE || '/usr/local/bin/chromium-no-sandbox';
  process.env.PUPPETEER_EXECUTABLE_PATH =
    process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';

  // YellowLabTools mapeia mobile como 'phone'
  const yltDevice = device === 'mobile' ? 'phone' : device;

  try {
    const results = await yellowlabtools(url, {
      device: yltDevice,
      timeout: 90,
      waitForNetworkIdle: false,
    });

    const durationMs = Date.now() - startTime;

    if (!results || !results.scoreProfiles || !results.scoreProfiles.generic) {
      console.error(`[YLT Runner] Resposta malformada para ${url}`);
      return {
        success: false,
        durationMs,
        error: 'A ferramenta YellowLabTools não retornou perfis de score válidos.',
      };
    }

    const profile = results.scoreProfiles.generic;

    console.log(
      `[YLT Runner] Auditoria concluída com sucesso para ${url} em ${durationMs}ms. Score: ${profile.globalScore}`
    );

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
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    console.error(`[YLT Runner] Falha ao auditar ${url}:`, err.message || err);
    return {
      success: false,
      durationMs,
      error: String(err.message || err),
    };
  }
}
