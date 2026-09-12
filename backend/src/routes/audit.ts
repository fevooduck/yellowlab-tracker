import { FastifyPluginAsync } from 'fastify';
import prisma from '../lib/prisma.js';
import { runYellowLabAudit } from '../lib/ylt-runner.js';
import { buildDeveloperActionPlan } from '../lib/action-plan.js';
import { runQueued, getAuditQueueStats } from '../lib/audit-queue.js';

function sanitizeJson(data: any) {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (e) {
    return {};
  }
}

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  // Disparar auditoria para uma URL específica
  fastify.post<{ Params: { urlId: string }; Querystring: { device?: 'mobile' | 'desktop' } }>(
    '/url/:urlId',
    async (request, reply) => {
      const urlId = parseInt(request.params.urlId, 10);
      const device = request.query.device || 'mobile';

      if (isNaN(urlId)) return reply.status(400).send({ error: 'ID inválido' });

      const urlRecord = await prisma.url.findUnique({
        where: { id: urlId },
        include: { domain: true },
      });

      if (!urlRecord) return reply.status(404).send({ error: 'URL não encontrada' });

      try {
        // O status só vira RUNNING quando a auditoria de fato começa a
        // executar (após adquirir a vaga na fila global) — evita mostrar
        // "Auditando" para uma URL que ainda está só esperando a vez.
        const result = await runQueued(async () => {
          await prisma.url.update({
            where: { id: urlId },
            data: { lastStatus: 'RUNNING' },
          });
          return runYellowLabAudit(urlRecord.url, device);
        });

        if (!result.success || !result.reportJson) {
          await prisma.url.update({
            where: { id: urlId },
            data: {
              lastStatus: 'FAILED',
              lastError: result.error || 'Falha desconhecida durante auditoria',
              lastRunAt: new Date(),
            },
          });
          return reply.status(500).send({
            error: result.error || 'Falha ao executar auditoria YellowLabTools',
          });
        }

        const safeReportJson = sanitizeJson(result.reportJson);

        // Cria o registro da auditoria
        const report = await prisma.yellowLabReport.create({
          data: {
            urlId: urlRecord.id,
            score: result.score ?? 0,
            pageWeightScore: result.pageWeightScore,
            requestsScore: result.requestsScore,
            domScore: result.domScore,
            jsScore: result.jsScore,
            cssScore: result.cssScore,
            serverConfigScore: result.serverConfigScore,
            reportJson: safeReportJson,
            durationMs: result.durationMs,
          },
        });

        // Atualiza URL com o status de sucesso e nota
        await prisma.url.update({
          where: { id: urlId },
          data: {
            lastStatus: 'SUCCESS',
            lastScore: result.score ?? 0,
            lastRunAt: new Date(),
            lastError: null,
          },
        });

        const actionPlan = buildDeveloperActionPlan(result.reportJson, result.score ?? 0);

        return {
          success: true,
          report: {
            id: report.id,
            score: report.score,
            pageWeightScore: report.pageWeightScore,
            requestsScore: report.requestsScore,
            domScore: report.domScore,
            jsScore: report.jsScore,
            cssScore: report.cssScore,
            serverConfigScore: report.serverConfigScore,
            durationMs: report.durationMs,
            createdAt: report.createdAt,
          },
          actionPlan,
        };
      } catch (err: any) {
        await prisma.url.update({
          where: { id: urlId },
          data: {
            lastStatus: 'FAILED',
            lastError: err.message,
            lastRunAt: new Date(),
          },
        });
        return reply.status(500).send({ error: err.message });
      }
    }
  );

interface DomainBatchState {
  domainId: number;
  total: number;
  currentIndex: number;
  currentUrl: string;
  completed: number;
  failed: number;
  isRunning: boolean;
  startedAt: number;
  finishedAt?: number;
}

const activeDomainBatches = new Map<number, DomainBatchState>();

  // Disparar auditoria em lote para todas as URLs ativas do domínio
  fastify.post<{ Params: { domainId: string } }>(
    '/domain/:domainId',
    async (request, reply) => {
      const domainId = parseInt(request.params.domainId, 10);
      if (isNaN(domainId)) return reply.status(400).send({ error: 'ID inválido' });

      const urls = await prisma.url.findMany({
        where: { domainId, isActive: true },
        orderBy: { lastRunAt: 'asc' },
      });

      if (urls.length === 0) {
        return reply.status(400).send({ error: 'Nenhuma URL ativa encontrada no domínio' });
      }

      // Inicializa estado de progresso
      const batchState: DomainBatchState = {
        domainId,
        total: urls.length,
        currentIndex: 0,
        currentUrl: urls[0].url,
        completed: 0,
        failed: 0,
        isRunning: true,
        startedAt: Date.now(),
      };
      activeDomainBatches.set(domainId, batchState);

      // Processa assincronamente em lote. O paralelismo real (quantas auditorias
      // rodam ao mesmo tempo) é controlado pela fila global em audit-queue.ts
      // (MAX_CONCURRENT_AUDITS) — aqui só despachamos todas as URLs do lote,
      // que aguardam a vez na fila junto com qualquer auditoria manual disparada
      // em paralelo (inclusive de outros domínios).
      (async () => {
        let completed = 0;
        let failed = 0;
        let queueIndex = 0;

        async function worker() {
          while (queueIndex < urls.length) {
            const i = queueIndex++;
            const u = urls[i];
            batchState.currentIndex = i + 1;
            batchState.currentUrl = u.url;

            try {
              // Mesma lógica da rota individual: só marca RUNNING quando a
              // vaga na fila global é de fato adquirida.
              const result = await runQueued(async () => {
                await prisma.url.update({
                  where: { id: u.id },
                  data: { lastStatus: 'RUNNING' },
                });
                return runYellowLabAudit(u.url, 'mobile');
              });

              if (result.success && result.reportJson) {
                const safeReportJson = sanitizeJson(result.reportJson);

                await prisma.yellowLabReport.create({
                  data: {
                    urlId: u.id,
                    score: result.score ?? 0,
                    pageWeightScore: result.pageWeightScore,
                    requestsScore: result.requestsScore,
                    domScore: result.domScore,
                    jsScore: result.jsScore,
                    cssScore: result.cssScore,
                    serverConfigScore: result.serverConfigScore,
                    reportJson: safeReportJson,
                    durationMs: result.durationMs,
                  },
                });

                await prisma.url.update({
                  where: { id: u.id },
                  data: {
                    lastStatus: 'SUCCESS',
                    lastScore: result.score ?? 0,
                    lastRunAt: new Date(),
                    lastError: null,
                  },
                });
                completed++;
              } else {
                await prisma.url.update({
                  where: { id: u.id },
                  data: {
                    lastStatus: 'FAILED',
                    lastError: result.error || 'Falha na auditoria',
                    lastRunAt: new Date(),
                  },
                });
                failed++;
              }
            } catch (e: any) {
              await prisma.url.update({
                where: { id: u.id },
                data: {
                  lastStatus: 'FAILED',
                  lastError: e.message,
                  lastRunAt: new Date(),
                },
              });
              failed++;
            }

            batchState.completed = completed;
            batchState.failed = failed;
          }
        }

        // Despacha um "worker" por URL do lote; o throttling real de execuções
        // simultâneas de Chromium acontece dentro de runQueued.
        const workers = Array.from({ length: urls.length }, () => worker());
        await Promise.all(workers);

        batchState.isRunning = false;
        batchState.finishedAt = Date.now();
      })();

      return {
        message: `Auditoria iniciada para ${urls.length} URLs do domínio em segundo plano.`,
        totalUrls: urls.length,
      };
    }
  );

  // Status de progresso em tempo real da auditoria do domínio
  fastify.get<{ Params: { domainId: string } }>(
    '/domain/:domainId/status',
    async (request, reply) => {
      const domainId = parseInt(request.params.domainId, 10);
      if (isNaN(domainId)) return reply.status(400).send({ error: 'ID inválido' });

      const batch = activeDomainBatches.get(domainId);

      if (batch) {
        const percent =
          batch.total > 0
            ? Math.min(100, Math.round(((batch.completed + batch.failed) / batch.total) * 100))
            : 0;

        return {
          ...batch,
          percent,
          processed: batch.completed + batch.failed,
          queue: getAuditQueueStats(),
        };
      }

      // Fallback para consultar banco se não houver lote em memória
      const urls = await prisma.url.findMany({
        where: { domainId, isActive: true },
        select: { id: true, url: true, lastStatus: true },
      });

      const total = urls.length;
      const runningUrl = urls.find((u) => u.lastStatus === 'RUNNING');
      const isRunning = Boolean(runningUrl);
      const success = urls.filter((u) => u.lastStatus === 'SUCCESS').length;
      const failed = urls.filter((u) => u.lastStatus === 'FAILED').length;
      const processed = success + failed;
      const percent = total > 0 ? Math.round((processed / total) * 100) : 0;

      return {
        domainId,
        total,
        currentIndex: runningUrl ? 1 : total,
        currentUrl: runningUrl ? runningUrl.url : '',
        completed: success,
        failed,
        processed,
        percent,
        isRunning,
        startedAt: Date.now(),
      };
    }
  );

  // Obter relatório individual com Action Plan detalhado
  fastify.get<{ Params: { reportId: string } }>(
    '/report/:reportId',
    async (request, reply) => {
      const reportId = parseInt(request.params.reportId, 10);
      if (isNaN(reportId)) return reply.status(400).send({ error: 'ID inválido' });

      const report = await prisma.yellowLabReport.findUnique({
        where: { id: reportId },
        include: {
          url: {
            include: { domain: true },
          },
        },
      });

      if (!report) return reply.status(404).send({ error: 'Relatório não encontrado' });

      const actionPlan = buildDeveloperActionPlan(report.reportJson, report.score ?? 0);

      return {
        report: {
          id: report.id,
          urlId: report.urlId,
          url: report.url.url,
          label: report.url.label,
          category: report.url.category,
          domainName: report.url.domain.name,
          score: report.score,
          pageWeightScore: report.pageWeightScore,
          requestsScore: report.requestsScore,
          domScore: report.domScore,
          jsScore: report.jsScore,
          cssScore: report.cssScore,
          serverConfigScore: report.serverConfigScore,
          durationMs: report.durationMs,
          createdAt: report.createdAt,
          fullJson: report.reportJson,
        },
        actionPlan,
      };
    }
  );

  // Comparador (Diff) entre duas auditorias
  fastify.get<{ Params: { oldId: string; newId: string } }>(
    '/diff/:oldId/:newId',
    async (request, reply) => {
      const oldId = parseInt(request.params.oldId, 10);
      const newId = parseInt(request.params.newId, 10);

      if (isNaN(oldId) || isNaN(newId)) {
        return reply.status(400).send({ error: 'IDs inválidos' });
      }

      const [oldReport, newReport] = await Promise.all([
        prisma.yellowLabReport.findUnique({ where: { id: oldId } }),
        prisma.yellowLabReport.findUnique({ where: { id: newId } }),
      ]);

      if (!oldReport || !newReport) {
        return reply.status(404).send({ error: 'Um dos relatórios não foi encontrado' });
      }

      const scoreDiff = (newReport.score ?? 0) - (oldReport.score ?? 0);
      const categoriesDiff = {
        pageWeight: (newReport.pageWeightScore ?? 0) - (oldReport.pageWeightScore ?? 0),
        requests: (newReport.requestsScore ?? 0) - (oldReport.requestsScore ?? 0),
        dom: (newReport.domScore ?? 0) - (oldReport.domScore ?? 0),
        js: (newReport.jsScore ?? 0) - (oldReport.jsScore ?? 0),
        css: (newReport.cssScore ?? 0) - (oldReport.cssScore ?? 0),
        serverConfig: (newReport.serverConfigScore ?? 0) - (oldReport.serverConfigScore ?? 0),
      };

      return {
        oldReport: {
          id: oldReport.id,
          score: oldReport.score,
          createdAt: oldReport.createdAt,
        },
        newReport: {
          id: newReport.id,
          score: newReport.score,
          createdAt: newReport.createdAt,
        },
        scoreDiff,
        categoriesDiff,
        isImproved: scoreDiff > 0,
        isRegressed: scoreDiff < 0,
      };
    }
  );
};
