import zlib from 'zlib';

export interface SitemapUrlEntry {
  url: string;
  lastmod?: string;
  alreadyExists?: boolean;
  suggestedCategory: string;
}

export interface SitemapParseResult {
  isIndex: boolean;
  subSitemaps: string[];
  urls: SitemapUrlEntry[];
}

function decodeXmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([a-fA-F0-9]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .trim();
}

function resolveUrl(targetUrl: string, baseUrl?: string): string {
  const clean = targetUrl.trim();
  if (!clean) return '';
  if (baseUrl) {
    try {
      return new URL(clean, baseUrl).href;
    } catch {
      // continua para fallback
    }
  }
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    return `https://${clean}`;
  }
  return clean;
}

export function suggestCategoryFromUrl(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const path = parsed.pathname.toLowerCase();

    if (path === '' || path === '/') {
      return 'Home';
    }
    if (/\/(produto|produto-detalhe|pdp|item|product|p)(\/|$)/i.test(path)) {
      return 'Produto';
    }
    if (/\/(categoria|departamento|colecao|category|plp|c|secao)(\/|$)/i.test(path)) {
      return 'Categoria';
    }
    if (/\/(carrinho|cart|sacola|basket)(\/|$)/i.test(path)) {
      return 'Carrinho';
    }
    if (/\/(checkout|finalizar|pagamento|payment)(\/|$)/i.test(path)) {
      return 'Checkout';
    }
    if (/\/(landing|lp|campanha|promocao|promo)(\/|$)/i.test(path)) {
      return 'Landing Page';
    }
    if (/\/(sobre|contato|institucional|blog|post|artigo|noticia|faq|termos|privacidade|ajuda|quem-somos)(\/|$)/i.test(path)) {
      return 'Institucional';
    }
  } catch {
    // URL inválida, mantém Geral
  }
  return 'Geral';
}

export async function fetchSitemapXml(url: string, timeoutMs = 20000): Promise<string> {
  let finalUrl = url.trim();
  if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
    finalUrl = `https://${finalUrl}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(finalUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'application/xml, text/xml, application/xhtml+xml, text/html;q=0.9, text/plain;q=0.8, */*;q=0.7',
      },
    });

    if (!res.ok) {
      throw new Error(`Falha ao buscar sitemap: HTTP ${res.status} ${res.statusText}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    // Se o buffer começar com os magic bytes do gzip (0x1f 0x8b), descomprime
    if (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
      try {
        return zlib.gunzipSync(buffer).toString('utf-8');
      } catch (err: any) {
        return buffer.toString('utf-8');
      }
    }

    return buffer.toString('utf-8');
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Tempo limite excedido (${timeoutMs / 1000}s) ao resgatar sitemap em ${finalUrl}`);
    }
    const causeMsg = err.cause ? ` (${err.cause.message || err.cause})` : '';
    throw new Error(`${err.message}${causeMsg}`);
  } finally {
    clearTimeout(timer);
  }
}

export function parseSitemapXml(xmlContent: string, baseUrl?: string): SitemapParseResult {
  if (!xmlContent || !xmlContent.trim()) {
    return { isIndex: false, subSitemaps: [], urls: [] };
  }

  // Suporte a sitemaps em texto puro (.txt com uma URL por linha)
  if (!xmlContent.includes('<') && (xmlContent.includes('http://') || xmlContent.includes('https://'))) {
    const lines = xmlContent
      .split(/[\r\n]+/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith('http://') || l.startsWith('https://'));

    const textUrls: SitemapUrlEntry[] = lines.map((u) => ({
      url: u,
      suggestedCategory: suggestCategoryFromUrl(u),
    }));

    return {
      isIndex: false,
      subSitemaps: [],
      urls: textUrls,
    };
  }

  // Remove comentários XML para evitar falsos positivos
  const cleanXml = xmlContent.replace(/<!--[\s\S]*?-->/g, '');

  const isIndexTag = /<(?:[a-zA-Z0-9_-]+:)?sitemapindex[\s>]/i.test(cleanXml);
  const subSitemaps: string[] = [];
  const urls: SitemapUrlEntry[] = [];

  // Extrai blocos <sitemap>...<loc>...</loc>...</sitemap>
  const sitemapBlocks = cleanXml.match(/<(?:[a-zA-Z0-9_-]+:)?sitemap\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?sitemap>/gi) || [];
  for (const block of sitemapBlocks) {
    const locMatch = block.match(/<(?:[a-zA-Z0-9_-]+:)?loc\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?loc>/i);
    if (locMatch && locMatch[1]) {
      const cleanLoc = decodeXmlEntities(locMatch[1]);
      if (cleanLoc) {
        const resolved = resolveUrl(cleanLoc, baseUrl);
        if (resolved) subSitemaps.push(resolved);
      }
    }
  }

  // Extrai blocos <url>...<loc>...</loc>...</url>
  const urlBlocks = cleanXml.match(/<(?:[a-zA-Z0-9_-]+:)?url\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?url>/gi) || [];
  for (const block of urlBlocks) {
    const locMatch = block.match(/<(?:[a-zA-Z0-9_-]+:)?loc\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?loc>/i);
    if (locMatch && locMatch[1]) {
      const cleanLoc = decodeXmlEntities(locMatch[1]);
      if (cleanLoc) {
        const resolved = resolveUrl(cleanLoc, baseUrl);
        if (resolved) {
          const lastmodMatch = block.match(/<(?:[a-zA-Z0-9_-]+:)?lastmod\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?lastmod>/i);
          const lastmod = lastmodMatch && lastmodMatch[1] ? decodeXmlEntities(lastmodMatch[1]) : undefined;
          urls.push({
            url: resolved,
            lastmod,
            suggestedCategory: suggestCategoryFromUrl(resolved),
          });
        }
      }
    }
  }

  // Fallback: se não encontrou nenhum bloco <url> nem <sitemap>, mas existem tags <loc> avulsas
  if (sitemapBlocks.length === 0 && urlBlocks.length === 0) {
    const standaloneLocMatches = cleanXml.matchAll(/<(?:[a-zA-Z0-9_-]+:)?loc\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?loc>/gi);
    for (const match of standaloneLocMatches) {
      if (match && match[1]) {
        const cleanLoc = decodeXmlEntities(match[1]);
        if (cleanLoc) {
          const resolved = resolveUrl(cleanLoc, baseUrl);
          if (resolved) {
            urls.push({
              url: resolved,
              suggestedCategory: suggestCategoryFromUrl(resolved),
            });
          }
        }
      }
    }
  }

  return {
    isIndex: (isIndexTag || subSitemaps.length > 0) && urls.length === 0,
    subSitemaps,
    urls,
  };
}
