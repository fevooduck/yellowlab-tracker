import Fastify from 'fastify';
import cors from '@fastify/cors';
import { domainRoutes } from './routes/domains.js';
import { urlRoutes } from './routes/urls.js';
import { auditRoutes } from './routes/audit.js';

const fastify = Fastify({
  logger: true,
  bodyLimit: 50 * 1024 * 1024, // 50MB para importação em lote de grandes sitemaps
});

import prisma from './lib/prisma.js';

process.on('uncaughtException', (err) => {
  console.error('⚠️ [Uncaught Exception tratada]:', err.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Unhandled Rejection tratada]:', reason);
});

async function main() {
  // Recupera status de URLs que ficaram travadas em RUNNING caso o container tenha reiniciado
  try {
    await prisma.url.updateMany({
      where: { lastStatus: 'RUNNING' },
      data: { lastStatus: 'PENDING' },
    });
  } catch (e) {
    console.error('Aviso ao recuperar status de URLs:', e);
  }

  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Health check
  fastify.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'yellowlab-tracker-api',
  }));

  // Registra as rotas
  await fastify.register(domainRoutes, { prefix: '/api/domains' });
  await fastify.register(urlRoutes, { prefix: '/api/urls' });
  await fastify.register(auditRoutes, { prefix: '/api/audit' });

  const port = Number(process.env.API_PORT) || 3021;
  const host = '0.0.0.0';

  try {
    await fastify.listen({ port, host });
    console.log(`🚀 Fastify Backend rodando em http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
