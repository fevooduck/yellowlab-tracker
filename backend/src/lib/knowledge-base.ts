export type EffortLevel = 'QUICK_WIN' | 'MEDIUM' | 'STRUCTURAL';

export interface RuleMeta {
  title: string;
  category: string;
  effort: EffortLevel;
  impactWeight: number; // 1 (baixo), 2 (médio), 3 (alto/crítico)
  formatValue?: (val: any) => string;
  problemSummary: (val: any) => string;
  howToFix: string[];
  codeSnippet?: string;
  extractOffenders?: (offendersObj: any) => Array<{ label: string; detail?: string; metric?: string }>;
}

export const RULE_KNOWLEDGE_BASE: Record<string, RuleMeta> = {
  gzipCompression: {
    title: 'Compressão HTTP Ausente (Gzip / Brotli)',
    category: 'Configuração do Servidor',
    effort: 'QUICK_WIN',
    impactWeight: 3,
    formatValue: (val) => `${val} recursos não comprimidos`,
    problemSummary: (val) => `${val} arquivos de texto (HTML, CSS, JS) foram transferidos sem compressão HTTP, aumentando drasticamente o tempo de download.`,
    howToFix: [
      'Ative compressão Brotli ou Gzip no servidor web (Nginx, Apache, CDN ou Cloudflare).',
      'Verifique se as extensões .js, .css, .json e .svg estão incluídas na lista de tipos MIME comprimidos.'
    ],
    codeSnippet: '# Nginx exemplo:\ngzip on;\ngzip_types text/plain text/css application/json application/javascript text/xml application/xml+rss image/svg+xml;\ngzip_min_length 1000;',
    extractOffenders: (offenders) => {
      const list = Array.isArray(offenders) ? offenders : offenders?.list || [];
      return list.map((item: any) => ({
        label: typeof item === 'string' ? item : item.url || JSON.stringify(item),
        metric: item.size ? `${Math.round(item.size / 1024)} KB` : undefined
      }));
    }
  },

  emptyRules: {
    title: 'Regras CSS Vazias',
    category: 'CSS & Estilo',
    effort: 'QUICK_WIN',
    impactWeight: 1,
    formatValue: (val) => `${val} regras vazias`,
    problemSummary: (val) => `Declarações CSS sem nenhuma propriedade aumentam o peso do CSS e gastam tempo do parser sem aplicar nenhum estilo.`,
    howToFix: [
      'Execute um minificador ou linter moderno (LightningCSS, PostCSS cssnano, esbuild).',
      'Remova seletores de placeholders vazios em arquivos SCSS/LESS.'
    ],
    codeSnippet: '/* Evite no código final: */\n.card-header {\n  /* Vazio */\n}\n\n/* Use cssnano no postcss.config.js */\nmodule.exports = { plugins: [require("cssnano")] };',
    extractOffenders: (offenders) => {
      const list = Array.isArray(offenders) ? offenders : offenders?.list || [];
      return list.map((item: any) => ({
        label: typeof item === 'string' ? item : item.selector || item.rule || JSON.stringify(item),
        detail: item.url
      }));
    }
  },

  webfontsCount: {
    title: 'Excesso de Fontes Web Customizadas',
    category: 'Design & Tipografia',
    effort: 'QUICK_WIN',
    impactWeight: 2,
    formatValue: (val) => `${val} fontes`,
    problemSummary: (val) => `Muitas variações de fontes baixadas simultaneamente geram atraso na exibição do texto (FOIT/FOUT) e consomem largura de banda.`,
    howToFix: [
      'Limite o site a no máximo 2 famílias tipográficas e 3 pesos essenciais (ex: 400, 600, 700).',
      'Adicione `font-display: swap` para que o texto seja legível imediatamente com fontes do sistema.'
    ],
    codeSnippet: '@font-face {\n  font-family: "BrandFont";\n  src: url("/fonts/brand.woff2") format("woff2");\n  font-display: swap;\n}',
    extractOffenders: (offenders) => {
      const list = Array.isArray(offenders) ? offenders : offenders?.list || [];
      return list.map((item: any) => ({
        label: typeof item === 'string' ? item : item.url || item.family || JSON.stringify(item),
        metric: item.size ? `${Math.round(item.size / 1024)} KB` : undefined
      }));
    }
  },

  DOMinserts: {
    title: 'Inserções Excessivas no DOM',
    category: 'JavaScript & Interatividade',
    effort: 'MEDIUM',
    impactWeight: 2,
    formatValue: (val) => `${val} inserções`,
    problemSummary: (val) => `Múltiplas inserções individuais no DOM (append/appendChild repetitivo) forçam constantes recálculos de layout e reflows.`,
    howToFix: [
      'Agrupe inserções usando `DocumentFragment` antes de adicionar ao documento.',
      'Ou monte strings de HTML acumuladas e faça uma única atribuição com `insertAdjacentHTML` ou `innerHTML`.'
    ],
    codeSnippet: '// Correção usando DocumentFragment:\nconst fragment = document.createDocumentFragment();\nitems.forEach(item => {\n  const el = createItemElement(item);\n  fragment.appendChild(el);\n});\ncontainer.appendChild(fragment);'
  },

  DOMqueries: {
    title: 'Consultas Repetidas ao DOM',
    category: 'JavaScript & Interatividade',
    effort: 'QUICK_WIN',
    impactWeight: 2,
    formatValue: (val) => `${val} consultas repetidas`,
    problemSummary: (val) => `Buscar o mesmo elemento no DOM repetidamente (ex: document.querySelector('#header')) dentro de loops ou eventos degrada a performance.`,
    howToFix: [
      'Faça cache de seletores em variáveis fora de loops e listeners de eventos.',
      'Utilize event delegation no container pai em vez de listeners individuais.'
    ],
    codeSnippet: '// Ruim:\nfor(let i=0; i<arr.length; i++) { document.querySelector("#status").innerText = i; }\n\n// Bom (com cache):\nconst statusEl = document.querySelector("#status");\nfor(let i=0; i<arr.length; i++) { statusEl.innerText = i; }'
  },

  DOMdepth: {
    title: 'Profundidade Excessiva da Árvore DOM',
    category: 'Complexidade do DOM',
    effort: 'STRUCTURAL',
    impactWeight: 3,
    formatValue: (val) => `Profundidade de ${val} níveis`,
    problemSummary: (val) => `Árvores DOM muito profundas exigem cálculos pesados de estilo e travam o navegador durante mutações e scroll.`,
    howToFix: [
      'Simplifique templates eliminando `divs` e `wrappers` desnecessários (divitis).',
      'Em React/Vue, utilize `<>` (Fragments) em vez de aninhar múltiplos containers.'
    ],
    codeSnippet: '// Evite aninhamentos supérfluos:\n// Ruim: <div><div class="wrapper"><div class="container"><p>Texto</p></div></div></div>\n// Bom:  <div class="container"><p>Texto</p></div>'
  },

  DOMelementMaxChildren: {
    title: 'Elemento Pai com Filhos Excessivos',
    category: 'Complexidade do DOM',
    effort: 'STRUCTURAL',
    impactWeight: 2,
    formatValue: (val) => `${val} filhos diretos`,
    problemSummary: (val) => `Um elemento individual com centenas ou milhares de nós filhos sobrecarrega a thread de renderização.`,
    howToFix: [
      'Implemente Virtual Scrolling / Windowing para listas longas (ex: react-window, TanStack Virtual).',
      'Adicione paginação ou paginação infinita controlada por IntersectionObserver.'
    ],
    codeSnippet: '// Usando paginação ou IntersectionObserver para lazy rendering de itens'
  },

  duplicatedSelectors: {
    title: 'Seletores CSS Duplicados',
    category: 'CSS & Estilo',
    effort: 'QUICK_WIN',
    impactWeight: 1,
    formatValue: (val) => `${val} seletores duplicados`,
    problemSummary: (val) => `O mesmo seletor CSS foi declarado várias vezes em arquivos ou blocos diferentes, gerando código redundante.`,
    howToFix: [
      'Unifique as propriedades sob um único seletor.',
      'Configure o PostCSS com `postcss-combine-duplicated-selectors`.'
    ],
    codeSnippet: '// No postcss.config.js:\nmodule.exports = {\n  plugins: [\n    require("postcss-combine-duplicated-selectors")()\n  ]\n};',
    extractOffenders: (offenders) => {
      const list = Array.isArray(offenders) ? offenders : offenders?.list || [];
      return list.map((item: any) => ({
        label: typeof item === 'string' ? item : item.selector || JSON.stringify(item),
        metric: item.count ? `${item.count}x` : undefined
      }));
    }
  },

  totalWeight: {
    title: 'Peso Total da Página Elevado',
    category: 'Peso da Página',
    effort: 'STRUCTURAL',
    impactWeight: 3,
    formatValue: (val) => `${Math.round(val / 1024)} KB transferidos`,
    problemSummary: (val) => `A página transfere um volume excessivo de dados no carregamento inicial, prejudicando conexões móveis e 4G/3G.`,
    howToFix: [
      'Converta imagens para formatos modernos (WebP ou AVIF).',
      'Ative Code Splitting e Dynamic Imports nos pacotes JavaScript.',
      'Remova dependências pesadas e subutilizadas (ex: Moment.js substituído por date-fns).'
    ]
  },

  jsWeight: {
    title: 'Volume Excessivo de JavaScript',
    category: 'Qualidade JavaScript',
    effort: 'STRUCTURAL',
    impactWeight: 3,
    formatValue: (val) => `${Math.round(val / 1024)} KB de scripts`,
    problemSummary: (val) => `Scripts muito pesados aumentam o tempo de parse/compilação e bloqueiam a thread principal do navegador (alto TBT).`,
    howToFix: [
      'Divida o código em chunks (Code Splitting).',
      'Adicione `defer` ou `async` em tags `<script>`.',
      'Carregue bibliotecas de terceiros (Analytics, Chat) via Web Workers (Partytown) ou sob demanda.'
    ],
    codeSnippet: '<!-- Exemplo de carregamento não bloqueante -->\n<script src="/bundle.js" defer></script>'
  }
};
