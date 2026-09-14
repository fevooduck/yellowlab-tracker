import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  FileCode,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Search,
  CheckSquare,
  Square,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FolderTree,
} from 'lucide-react';
import { useToast } from './Toast';

interface SitemapUrlItem {
  url: string;
  lastmod?: string;
  alreadyExists?: boolean;
  suggestedCategory: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  domainId: number;
  domainName: string;
}

const CATEGORIES = [
  'Geral',
  'Home',
  'Categoria',
  'Produto',
  'Carrinho',
  'Checkout',
  'Landing Page',
  'Institucional',
];

const ITEMS_PER_PAGE = 50;

export default function SitemapImportModal({
  isOpen,
  onClose,
  onSuccess,
  domainId,
  domainName,
}: Props) {
  const toast = useToast();
  const [sitemapUrl, setSitemapUrl] = useState(`https://${domainName}/sitemap.xml`);
  const [fetchAllChildren, setFetchAllChildren] = useState(true);

  const [loadingFetch, setLoadingFetch] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    currentBatch: number;
    totalBatches: number;
    processedCount: number;
    totalCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fetchedData, setFetchedData] = useState<{
    sitemapUrl: string;
    isIndex: boolean;
    subSitemaps: string[];
    urls: SitemapUrlItem[];
    totalFound: number;
    newCount: number;
    existingCount: number;
  } | null>(null);

  // Seleção de URLs por conjunto de strings
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [overrideCategory, setOverrideCategory] = useState<string>('AUTO');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'EXISTING'>('NEW');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset e inicialização limpa sempre que o modal for aberto ou o domínio mudar
  useEffect(() => {
    if (isOpen) {
      const cleanHost = domainName.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
      setSitemapUrl(`https://${cleanHost}/sitemap.xml`);
      setError(null);
      setFetchedData(null);
      setSelectedUrls(new Set());
      setSearchFilter('');
      setCurrentPage(1);
      setImportProgress(null);
    }
  }, [isOpen, domainName]);

  const handleFetchSitemap = async (customUrl?: string) => {
    const urlToFetch = customUrl || sitemapUrl;
    if (!urlToFetch.trim()) {
      setError('Por favor, informe a URL do sitemap.');
      return;
    }

    setLoadingFetch(true);
    setError(null);
    try {
      const res = await fetch('/api/urls/sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId,
          sitemapUrl: urlToFetch,
          fetchAllChildren,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao resgatar sitemap.');
      }

      setFetchedData(data);

      // Por padrão, seleciona automaticamente todas as URLs novas
      const newUrls = new Set<string>();
      data.urls.forEach((item: SitemapUrlItem) => {
        if (!item.alreadyExists) {
          newUrls.add(item.url);
        }
      });
      setSelectedUrls(newUrls);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar sitemap.');
    } finally {
      setLoadingFetch(false);
    }
  };

  const handleToggleUrl = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  // Filtro das URLs exibidas
  const filteredUrls = useMemo(() => {
    if (!fetchedData) return [];
    return fetchedData.urls.filter((item) => {
      const matchesSearch = item.url.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'NEW' && !item.alreadyExists) ||
        (statusFilter === 'EXISTING' && item.alreadyExists);
      return matchesSearch && matchesStatus;
    });
  }, [fetchedData, searchFilter, statusFilter]);

  const totalPages = Math.ceil(filteredUrls.length / ITEMS_PER_PAGE) || 1;
  const paginatedUrls = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUrls.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUrls, currentPage]);

  const handleSelectAllFiltered = () => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      filteredUrls.forEach((i) => next.add(i.url));
      return next;
    });
  };

  const handleSelectOnlyNewFiltered = () => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      filteredUrls.forEach((i) => {
        if (!i.alreadyExists) {
          next.add(i.url);
        } else {
          next.delete(i.url);
        }
      });
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelectedUrls(new Set());
  };

  const handleImport = async (importMode: 'SELECTED' | 'ALL_NEW') => {
    if (!fetchedData) return;

    let itemsToImport: Array<{ url: string; category: string; label: string }> = [];

    if (importMode === 'ALL_NEW') {
      itemsToImport = fetchedData.urls
        .filter((item) => !item.alreadyExists)
        .map((item) => ({
          url: item.url,
          category: overrideCategory === 'AUTO' ? item.suggestedCategory : overrideCategory,
          label: item.url,
        }));
    } else {
      itemsToImport = fetchedData.urls
        .filter((item) => selectedUrls.has(item.url))
        .map((item) => ({
          url: item.url,
          category: overrideCategory === 'AUTO' ? item.suggestedCategory : overrideCategory,
          label: item.url,
        }));
    }

    if (itemsToImport.length === 0) {
      toast.error('Nenhuma URL selecionada para importar.');
      return;
    }

    setLoadingImport(true);
    let totalCreated = 0;
    let totalSkipped = 0;
    const CHUNK_SIZE = 1000;
    const totalBatches = Math.ceil(itemsToImport.length / CHUNK_SIZE);

    try {
      for (let i = 0; i < itemsToImport.length; i += CHUNK_SIZE) {
        const batch = itemsToImport.slice(i, i + CHUNK_SIZE);
        const currentBatch = Math.floor(i / CHUNK_SIZE) + 1;

        setImportProgress({
          currentBatch,
          totalBatches,
          processedCount: Math.min(i + CHUNK_SIZE, itemsToImport.length),
          totalCount: itemsToImport.length,
        });

        const res = await fetch('/api/urls/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domainId,
            items: batch,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Erro no lote ${currentBatch} ao importar URLs.`);
        }

        totalCreated += data.createdCount || 0;
        totalSkipped += data.skippedCount || 0;
      }

      toast.success(
        `${totalCreated.toLocaleString('pt-BR')} URLs importadas com sucesso! (${totalSkipped.toLocaleString('pt-BR')} ignoradas/duplicadas)`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar URLs.');
    } finally {
      setLoadingImport(false);
      setImportProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0 bg-slate-800/90">
          <div className="flex items-center gap-2.5 text-white font-black text-lg">
            <div className="w-8 h-8 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <span>Resgatar do Sitemap XML</span>
              <span className="text-xs font-normal text-slate-400 block -mt-0.5">
                Domínio: <strong className="text-slate-200">{domainName}</strong>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário de Busca do Sitemap */}
        <div className="p-6 border-b border-slate-700/80 bg-slate-900/40 shrink-0 space-y-3">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type="url"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                placeholder="https://exemplo.com.br/sitemap.xml"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <button
              type="button"
              onClick={() => handleFetchSitemap()}
              disabled={loadingFetch}
              className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 transition-all disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingFetch ? 'animate-spin' : ''}`} />
              {loadingFetch ? 'Resgatando...' : 'Resgatar Sitemap'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="fetchChildrenCheck"
              checked={fetchAllChildren}
              onChange={(e) => setFetchAllChildren(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-yellow-400 focus:ring-0 focus:outline-none w-3.5 h-3.5 cursor-pointer"
            />
            <label
              htmlFor="fetchChildrenCheck"
              className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-300 select-none"
            >
              Se for um índice de sitemaps (<code className="text-yellow-400">sitemapindex</code>), buscar URLs dos sub-sitemaps automaticamente
            </label>
          </div>

          {/* Sub-sitemaps detectados (caso existam) */}
          {fetchedData?.subSitemaps && fetchedData.subSitemaps.length > 0 && (
            <div className="mt-3 p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl space-y-2">
              <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-yellow-400" />
                  Sub-sitemaps encontrados ({fetchedData.subSitemaps.length}):
                </div>
                {fetchedData.subSitemaps.length > 40 && (
                  <span className="text-[10px] text-slate-400 font-normal">
                    Exibindo os primeiros 40 sub-sitemaps
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {fetchedData.subSitemaps.slice(0, 40).map((sub, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSitemapUrl(sub);
                      handleFetchSitemap(sub);
                    }}
                    title={`Clique para carregar apenas este sitemap: ${sub}`}
                    className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-yellow-400 transition-colors truncate max-w-xs"
                  >
                    {sub.split('/').pop() || sub}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Área Central: Lista de URLs e Controles */}
        {fetchedData ? (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Barra de Status e Métricas */}
            <div className="px-6 py-3 bg-slate-800/60 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-700/60 text-slate-300 font-semibold">
                  Total: {fetchedData.totalFound.toLocaleString('pt-BR')}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                  {fetchedData.newCount.toLocaleString('pt-BR')} novas
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-700/40 text-slate-400 font-medium">
                  {fetchedData.existingCount.toLocaleString('pt-BR')} já cadastradas
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-bold">
                  {selectedUrls.size.toLocaleString('pt-BR')} selecionada(s)
                </span>
              </div>
            </div>

            {/* Toolbar de Filtros e Seleção Rápida */}
            <div className="p-4 border-b border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/30">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtrar por texto na URL..."
                    value={searchFilter}
                    onChange={(e) => {
                      setSearchFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e: any) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-yellow-400"
                >
                  <option value="NEW">Apenas Novas</option>
                  <option value="ALL">Todas as URLs</option>
                  <option value="EXISTING">Já Cadastradas</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Botões rápidos */}
                <button
                  type="button"
                  onClick={handleSelectOnlyNewFiltered}
                  className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg transition-colors"
                >
                  Selecionar Novas
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg transition-colors"
                >
                  Marcar Todas
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-lg transition-colors"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            {/* Opções de Categoria para Importação */}
            <div className="px-6 py-2.5 bg-slate-800/40 border-b border-slate-700/60 flex items-center justify-between gap-4 text-xs">
              <span className="text-slate-400">
                Categoria atribuída na importação:
              </span>
              <select
                value={overrideCategory}
                onChange={(e) => setOverrideCategory(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-white text-xs focus:outline-none focus:border-yellow-400"
              >
                <option value="AUTO">✨ Sugestão Automática por URL</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    Forçar "{cat}" para todas
                  </option>
                ))}
              </select>
            </div>

            {/* Tabela Rolável de URLs */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-700/40 min-h-0">
              {filteredUrls.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhuma URL encontrada com os filtros atuais.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-sm text-slate-400 uppercase tracking-wider font-bold text-[10px] border-b border-slate-700/60 z-10">
                    <tr>
                      <th className="py-2.5 px-4 w-10 text-center">Sel</th>
                      <th className="py-2.5 px-3">URL da Página</th>
                      <th className="py-2.5 px-3 w-28">Categoria</th>
                      <th className="py-2.5 px-3 w-24">Status</th>
                      <th className="py-2.5 px-3 w-10 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {paginatedUrls.map((item) => {
                      const isSelected = selectedUrls.has(item.url);
                      return (
                        <tr
                          key={item.url}
                          onClick={() => handleToggleUrl(item.url)}
                          className={`hover:bg-slate-700/30 cursor-pointer transition-colors ${
                            isSelected ? 'bg-yellow-400/5' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleUrl(item.url)}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded bg-slate-900 border-slate-700 text-yellow-400 focus:ring-0 focus:outline-none w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-200 break-all">
                            {item.url}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-300">
                              {overrideCategory === 'AUTO'
                                ? item.suggestedCategory
                                : overrideCategory}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {item.alreadyExists ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700/60 text-slate-400">
                                Já cadastrada
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                Nova
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="Abrir página em nova aba"
                              className="text-slate-500 hover:text-white transition-colors inline-block"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Barra de Paginação */}
            {totalPages > 1 && (
              <div className="px-6 py-2 bg-slate-900/60 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
                <span>
                  Mostrando {((currentPage - 1) * ITEMS_PER_PAGE + 1).toLocaleString('pt-BR')} até{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredUrls.length).toLocaleString('pt-BR')} de{' '}
                  {filteredUrls.length.toLocaleString('pt-BR')} filtradas
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 disabled:hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-semibold text-slate-200">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 disabled:hover:bg-slate-800"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 p-12 text-center space-y-3 flex flex-col items-center justify-center">
            <FileCode className="w-10 h-10 text-slate-600" />
            <div className="text-slate-300 font-semibold text-sm">
              Nenhum sitemap resgatado ainda
            </div>
            <p className="text-slate-500 text-xs max-w-md">
              Informe a URL do sitemap acima e clique em "Resgatar Sitemap" para listar todas as páginas do site e escolher quais deseja adicionar.
            </p>
          </div>
        )}

        {/* Rodapé de Ações */}
        <div className="p-4 sm:px-6 bg-slate-800/90 border-t border-slate-700 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {importProgress ? (
              <span className="text-yellow-400 font-semibold flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Importando lote {importProgress.currentBatch} de {importProgress.totalBatches} ({importProgress.processedCount.toLocaleString('pt-BR')} / {importProgress.totalCount.toLocaleString('pt-BR')} URLs)...
              </span>
            ) : fetchedData ? (
              <span>
                {selectedUrls.size > 0 ? (
                  <>
                    <strong className="text-yellow-400">{selectedUrls.size.toLocaleString('pt-BR')}</strong> URLs prontas para importar
                  </>
                ) : (
                  'Nenhuma URL selecionada'
                )}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={loadingImport}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Fechar
            </button>

            {fetchedData && fetchedData.newCount > 0 && (
              <button
                type="button"
                disabled={loadingImport}
                onClick={() => handleImport('ALL_NEW')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {loadingImport && importProgress
                  ? `Importando (${importProgress.processedCount}/${importProgress.totalCount})...`
                  : `Importar Todas as Novas (${fetchedData.newCount.toLocaleString('pt-BR')})`}
              </button>
            )}

            {fetchedData && (
              <button
                type="button"
                disabled={loadingImport || selectedUrls.size === 0}
                onClick={() => handleImport('SELECTED')}
                className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-yellow-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {loadingImport
                  ? 'Importando...'
                  : `Importar Selecionadas (${selectedUrls.size.toLocaleString('pt-BR')})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
