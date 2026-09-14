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

export async function fetchSitemapXml(url: string, timeoutMs = 15000): Promise<string> {
  let finalUrl = url.trim();
  if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
    finalUrl = `https://${finalUrl}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(finalUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 YellowLabTracker/1.0',
        Accept: 'application/xml, text/xml, application/xhtml+xml, text/html;q=0.9, */*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });

    if (!res.ok) {
      throw new Error(`Falha ao buscar sitemap: HTTP ${res.status} ${res.statusText}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentEncoding = res.headers.get('content-encoding') || '';
    const isGzip =
      contentEncoding.includes('gzip') ||
      finalUrl.toLowerCase().endsWith('.gz') ||
      (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b);

    if (isGzip) {
      try {
        return zlib.gunzipSync(buffer).toString('utf-8');
      } catch (err: any) {
        // Se a descompressão falhar, tenta interpretar como texto plano
        return buffer.toString('utf-8');
      }
    }

    return buffer.toString('utf-8');
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Tempo limite excedido (${timeoutMs / 1000}s) ao resgatar sitemap em ${finalUrl}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function parseSitemapXml(xmlContent: string): SitemapParseResult {
  const isIndex = /<sitemapindex[\s>]/i.test(xmlContent);
  const subSitemaps: string[] = [];
  const urls: SitemapUrlEntry[] = [];

  if (isIndex) {
    // Extrai <sitemap>...<loc>...</loc>...</sitemap>
    const sitemapBlocks = xmlContent.match(/<sitemap[\s>][\s\S]*?<\/sitemap>/gi) || [];
    for (const block of sitemapBlocks) {
      const locMatch = block.match(/<loc[\s>]([\s\S]*?)<\/loc>/i);
      if (locMatch && locMatch[1]) {
        const cleanLoc = decodeXmlEntities(locMatch[1]);
        if (cleanLoc) {
          subSitemaps.push(cleanLoc);
        }
      }
    }
  }

  // Também tenta extrair <url>...<loc>...</loc> caso existam
  const urlBlocks = xmlContent.match(/<url[\s>][\s\S]*?<\/url>/gi) || [];
  for (const block of urlBlocks) {
    const locMatch = block.match(/<loc[\s>]([\s\S]*?)<\/loc>/i);
    if (locMatch && locMatch[1]) {
      const cleanLoc = decodeXmlEntities(locMatch[1]);
      if (cleanLoc) {
        const lastmodMatch = block.match(/<lastmod[\s>]([\s\S]*?)<\/lastmod>/i);
        const lastmod = lastmodMatch && lastmodMatch[1] ? decodeXmlEntities(lastmodMatch[1]) : undefined;
        urls.push({
          url: cleanLoc,
          lastmod,
          suggestedCategory: suggestCategoryFromUrl(cleanLoc),
        });
      }
    }
  }

  return {
    isIndex: isIndex && urls.length === 0,
    subSitemaps,
    urls,
  };
}
