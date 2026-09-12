import { FastifyPluginAsync } from 'fastify';
import prisma from '../lib/prisma.js';

export const urlRoutes: FastifyPluginAsync = async (fastify) => {
  // Listar todas as URLs
  fastify.get<{
    Querystring: { domainId?: string; search?: string };
  }>('/', async (request) => {
    const { domainId, search } = request.query;

    const where: any = {};
    if (domainId) {
      where.domainId = parseInt(domainId, 10);
    }
    if (search) {
      where.OR = [
        { url: { contains: search, mode: 'insensitive' } },
        { label: { contains: search, mode: 'insensitive' } },
      ];
    }

    const urls = await prisma.url.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        domain: {
          select: { id: true, name: true, label: true },
        },
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
    });

    return urls;
  });

  // Obter detalhes de uma URL com histórico de relatórios
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const urlId = parseInt(request.params.id, 10);
    if (isNaN(urlId)) return reply.status(400).send({ error: 'ID inválido' });

    const item = await prisma.url.findUnique({
      where: { id: urlId },
      include: {
        domain: true,
        reports: {
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
    });

    if (!item) return reply.status(404).send({ error: 'URL não encontrada' });
    return item;
  });

  // Criar URL individual
  fastify.post<{
    Body: {
      url: string;
      domainId: number;
      label?: string;
      category?: string;
    };
  }>('/', async (request, reply) => {
    const { url, domainId, label, category } = request.body || {};

    if (!url || !domainId) {
      return reply.status(400).send({ error: 'URL e domainId são obrigatórios' });
    }

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      const created = await prisma.url.create({
        data: {
          url: cleanUrl,
          domainId: Number(domainId),
          label: label?.trim() || cleanUrl,
          category: category?.trim() || 'Geral',
        },
        include: { domain: true },
      });
      return created;
    } catch (err: any) {
      if (err.code === 'P2002') {
        return reply.status(409).send({ error: 'Esta URL já está cadastrada' });
      }
      return reply.status(500).send({ error: err.message });
    }
  });

  // Importação em massa de URLs
  fastify.post<{
    Body: {
      domainId: number;
      urlsText: string;
      category?: string;
    };
  }>('/batch', async (request, reply) => {
    const { domainId, urlsText, category } = request.body || {};

    if (!domainId || !urlsText) {
      return reply.status(400).send({ error: 'domainId e texto de URLs são obrigatórios' });
    }

    const domain = await prisma.domain.findUnique({
      where: { id: Number(domainId) },
    });
    if (!domain) return reply.status(404).send({ error: 'Domínio não encontrado' });

    // Divide por linhas ou quebras
    const lines = urlsText
      .split(/[\r\n]+/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return reply.status(400).send({ error: 'Nenhuma URL válida detectada no texto' });
    }

    let createdCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const rawLine of lines) {
      let finalUrl = rawLine;
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `https://${finalUrl}`;
      }

      try {
        await prisma.url.create({
          data: {
            url: finalUrl,
            domainId: domain.id,
            label: finalUrl,
            category: category?.trim() || 'Geral',
          },
        });
        createdCount++;
      } catch (err: any) {
        skippedCount++;
        if (err.code !== 'P2002') {
          errors.push(`${finalUrl}: ${err.message}`);
        }
      }
    }

    return {
      success: true,
      totalReceived: lines.length,
      createdCount,
      skippedCount,
      errors: errors.slice(0, 5),
    };
  });

  // Atualizar URL
  fastify.put<{
    Params: { id: string };
    Body: { label?: string; category?: string; isActive?: boolean };
  }>('/:id', async (request, reply) => {
    const urlId = parseInt(request.params.id, 10);
    if (isNaN(urlId)) return reply.status(400).send({ error: 'ID inválido' });

    const { label, category, isActive } = request.body || {};

    try {
      const updated = await prisma.url.update({
        where: { id: urlId },
        data: {
          ...(label ? { label: label.trim() } : {}),
          ...(category ? { category: category.trim() } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });
      return updated;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Excluir URL
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const urlId = parseInt(request.params.id, 10);
    if (isNaN(urlId)) return reply.status(400).send({ error: 'ID inválido' });

    await prisma.url.delete({
      where: { id: urlId },
    });

    return { success: true };
  });
};
