import { FastifyPluginAsync } from 'fastify';
import prisma from '../lib/prisma.js';
import { deleteReportsForUrl } from '../lib/report-storage.js';
import { fetchSitemapXml, parseSitemapXml, suggestCategoryFromUrl } from '../lib/sitemap-parser.js';

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

  // Resgatar e analisar sitemap de um domínio
  fastify.post<{
    Body: {
      domainId: number;
      sitemapUrl?: string;
      fetchAllChildren?: boolean;
    };
  }>('/sitemap', async (request, reply) => {
    const { domainId, sitemapUrl, fetchAllChildren } = request.body || {};

    if (!domainId) {
      return reply.status(400).send({ error: 'domainId é obrigatório' });
    }

    const domain = await prisma.domain.findUnique({
      where: { id: Number(domainId) },
    });
    if (!domain) {
      return reply.status(404).send({ error: 'Domínio não encontrado' });
    }

    let targetUrl = sitemapUrl?.trim();
    if (!targetUrl) {
      targetUrl = `https://${domain.name}/sitemap.xml`;
    } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    try {
      const xml = await fetchSitemapXml(targetUrl);
      const parsed = parseSitemapXml(xml);

      let allUrls = [...parsed.urls];
      const subSitemaps = [...parsed.subSitemaps];

      // Se for sitemap index e o usuário solicitou buscar os filhos
      if (parsed.isIndex && fetchAllChildren && subSitemaps.length > 0) {
        const toFetch = subSitemaps.slice(0, 10);
        for (const subUrl of toFetch) {
          try {
            const subXml = await fetchSitemapXml(subUrl, 10000);
            const subParsed = parseSitemapXml(subXml);
            allUrls.push(...subParsed.urls);
            if (allUrls.length >= 2500) break;
          } catch (e: any) {
            fastify.log.warn(`Falha ao buscar sub-sitemap ${subUrl}: ${e.message}`);
          }
        }
      }

      // Deduplica URLs encontradas no sitemap
      const uniqueUrlMap = new Map<string, (typeof allUrls)[0]>();
      for (const item of allUrls) {
        if (!uniqueUrlMap.has(item.url)) {
          uniqueUrlMap.set(item.url, item);
        }
      }
      const deduplicatedUrls = Array.from(uniqueUrlMap.values());

      // Busca URLs já cadastradas para este domínio
      const existingUrls = await prisma.url.findMany({
        where: { domainId: domain.id },
        select: { url: true },
      });
      const existingSet = new Set(existingUrls.map((u) => u.url.trim().toLowerCase()));

      let existingCount = 0;
      const enrichedUrls = deduplicatedUrls.map((item) => {
        const normalized = item.url.trim().toLowerCase();
        const alreadyExists = existingSet.has(normalized);
        if (alreadyExists) existingCount++;
        return {
          ...item,
          alreadyExists,
        };
      });

      return {
        success: true,
        sitemapUrl: targetUrl,
        isIndex: parsed.isIndex && enrichedUrls.length === 0,
        subSitemaps,
        urls: enrichedUrls,
        totalFound: enrichedUrls.length,
        newCount: enrichedUrls.length - existingCount,
        existingCount,
      };
    } catch (err: any) {
      return reply.status(400).send({
        error: `Erro ao resgatar sitemap: ${err.message}`,
      });
    }
  });

  // Importação em massa de URLs (suporta texto puro, array de URLs ou array de itens com categoria)
  fastify.post<{
    Body: {
      domainId: number;
      urlsText?: string;
      urls?: string[];
      items?: Array<{ url: string; category?: string; label?: string }>;
      category?: string;
    };
  }>('/batch', async (request, reply) => {
    const { domainId, urlsText, urls, items, category } = request.body || {};

    if (!domainId) {
      return reply.status(400).send({ error: 'domainId é obrigatório' });
    }

    const domain = await prisma.domain.findUnique({
      where: { id: Number(domainId) },
    });
    if (!domain) return reply.status(404).send({ error: 'Domínio não encontrado' });

    let toImport: Array<{ url: string; category: string; label: string }> = [];

    if (Array.isArray(items) && items.length > 0) {
      toImport = items
        .filter((i) => i && typeof i.url === 'string' && i.url.trim())
        .map((i) => ({
          url: i.url.trim(),
          category: i.category?.trim() || category?.trim() || 'Geral',
          label: i.label?.trim() || i.url.trim(),
        }));
    } else if (Array.isArray(urls) && urls.length > 0) {
      toImport = urls
        .filter((u) => typeof u === 'string' && u.trim())
        .map((u) => ({
          url: u.trim(),
          category: category?.trim() || 'Geral',
          label: u.trim(),
        }));
    } else if (typeof urlsText === 'string' && urlsText.trim()) {
      const lines = urlsText
        .split(/[\r\n]+/)
        .map((l) => l.trim())
        .filter(Boolean);

      toImport = lines.map((l) => ({
        url: l,
        category: category?.trim() || 'Geral',
        label: l,
      }));
    } else {
      return reply.status(400).send({ error: 'Nenhuma URL fornecida para importação' });
    }

    if (toImport.length === 0) {
      return reply.status(400).send({ error: 'Nenhuma URL válida detectada' });
    }

    let createdCount = 0;
    const CHUNK_SIZE = 1000;

    for (let i = 0; i < toImport.length; i += CHUNK_SIZE) {
      const chunk = toImport.slice(i, i + CHUNK_SIZE).map((item) => {
        let finalUrl = item.url;
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
          finalUrl = `https://${finalUrl}`;
        }
        return {
          url: finalUrl,
          domainId: domain.id,
          label: item.label || finalUrl,
          category: item.category || 'Geral',
        };
      });

      try {
        const result = await prisma.url.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        createdCount += result.count;
      } catch (err: any) {
        // Fallback para inserção individual caso ocorra erro inesperado no chunk
        for (const item of chunk) {
          try {
            await prisma.url.create({ data: item });
            createdCount++;
          } catch {
            // ignora duplicatas
          }
        }
      }
    }

    const skippedCount = Math.max(0, toImport.length - createdCount);

    return {
      success: true,
      totalReceived: toImport.length,
      createdCount,
      skippedCount,
      errors: [],
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

    // Remove os relatórios em disco dessa URL (os registros no Postgres já
    // saíram em cascata via onDelete: Cascade do Prisma).
    await deleteReportsForUrl(urlId);

    return { success: true };
  });
};
