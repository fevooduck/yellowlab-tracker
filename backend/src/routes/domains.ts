import { FastifyPluginAsync } from 'fastify';
import prisma from '../lib/prisma.js';

export const domainRoutes: FastifyPluginAsync = async (fastify) => {
  // Listar domínios com estatísticas agregadas
  fastify.get('/', async () => {
    const domains = await prisma.domain.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        urls: {
          select: {
            id: true,
            url: true,
            lastStatus: true,
            lastScore: true,
            lastRunAt: true,
            isActive: true,
          },
        },
      },
    });

    return domains.map((domain) => {
      const activeUrls = domain.urls.filter((u) => u.isActive);
      const scoredUrls = activeUrls.filter((u) => u.lastScore !== null);
      const avgScore =
        scoredUrls.length > 0
          ? Math.round(
              scoredUrls.reduce((acc, u) => acc + (u.lastScore || 0), 0) /
                scoredUrls.length
            )
          : null;

      const lastAudit = domain.urls
        .map((u) => u.lastRunAt)
        .filter(Boolean)
        .sort((a, b) => (b ? b.getTime() : 0) - (a ? a.getTime() : 0))[0] || null;

      return {
        id: domain.id,
        name: domain.name,
        label: domain.label,
        description: domain.description,
        isActive: domain.isActive,
        createdAt: domain.createdAt,
        totalUrls: domain.urls.length,
        activeUrls: activeUrls.length,
        avgScore,
        lastAudit,
      };
    });
  });

  // Obter detalhes de um domínio com todas as URLs
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const domainId = parseInt(request.params.id, 10);
    if (isNaN(domainId)) return reply.status(400).send({ error: 'ID inválido' });

    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      include: {
        urls: {
          orderBy: { createdAt: 'desc' },
          include: {
            reports: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                score: true,
                pageWeightScore: true,
                requestsScore: true,
                domScore: true,
                jsScore: true,
                cssScore: true,
                serverConfigScore: true,
                durationMs: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!domain) return reply.status(404).send({ error: 'Domínio não encontrado' });
    return domain;
  });

  // Criar novo domínio
  fastify.post<{
    Body: { name: string; label: string; description?: string };
  }>('/', async (request, reply) => {
    const { name, label, description } = request.body || {};

    if (!name || !label) {
      return reply.status(400).send({ error: 'Nome (host) e Rótulo são obrigatórios' });
    }

    // Normaliza nome do domínio removendo protocolo e barras finais
    const cleanName = name.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim().toLowerCase();

    try {
      const newDomain = await prisma.domain.create({
        data: {
          name: cleanName,
          label: label.trim(),
          description: description?.trim(),
        },
      });
      return newDomain;
    } catch (err: any) {
      if (err.code === 'P2002') {
        return reply.status(409).send({ error: 'Este domínio já está cadastrado' });
      }
      return reply.status(500).send({ error: err.message });
    }
  });

  // Atualizar domínio
  fastify.put<{
    Params: { id: string };
    Body: { name?: string; label?: string; description?: string; isActive?: boolean };
  }>('/:id', async (request, reply) => {
    const domainId = parseInt(request.params.id, 10);
    if (isNaN(domainId)) return reply.status(400).send({ error: 'ID inválido' });

    const { name, label, description, isActive } = request.body || {};

    try {
      const updated = await prisma.domain.update({
        where: { id: domainId },
        data: {
          ...(name ? { name: name.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim().toLowerCase() } : {}),
          ...(label ? { label: label.trim() } : {}),
          ...(description !== undefined ? { description: description?.trim() } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });
      return updated;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Excluir domínio
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const domainId = parseInt(request.params.id, 10);
    if (isNaN(domainId)) return reply.status(400).send({ error: 'ID inválido' });

    await prisma.domain.delete({
      where: { id: domainId },
    });

    return { success: true };
  });
};
