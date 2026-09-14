import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Globe, Plus, Layers, Play, ArrowLeft, Link2, Clock, Trash2, ExternalLink, RefreshCw, AlertCircle, FileCode } from 'lucide-react';
import ScoreBadge from '../components/ScoreBadge';
import UrlModal from '../components/UrlModal';
import BatchUrlModal from '../components/BatchUrlModal';
import SitemapImportModal from '../components/SitemapImportModal';
import { DomainAuditProgressBar } from '../components/AuditProgressBar';
import { useToast, useConfirm } from '../components/Toast';

export default function DomainDetailPage() {
  const { domainId } = useParams<{ domainId: string }>();
  const toast = useToast();
  const confirm = useConfirm();
  const [domain, setDomain] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isSitemapModalOpen, setIsSitemapModalOpen] = useState(false);
  const [auditingUrls, setAuditingUrls] = useState<Record<number, boolean>>({});
  const [batchAuditing, setBatchAuditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDomain = async () => {
    try {
      const res = await fetch(`/api/domains/${domainId}`);
      const data = await res.json();

      if (!res.ok) {
        setDomain(null);
        setError(data?.error || `Erro ao carregar domínio (HTTP ${res.status})`);
        return;
      }

      setDomain(data);
      setError(null);
    } catch (err: any) {
      setDomain(null);
      setError(err?.message || 'Falha de conexão ao buscar o domínio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomain();
  }, [domainId]);

  const handleAuditSingle = async (urlId: number) => {
    setAuditingUrls((prev) => ({ ...prev, [urlId]: true }));
    try {
      const res = await fetch(`/api/audit/url/${urlId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || 'Erro ao auditar URL');
      fetchDomain();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAuditingUrls((prev) => ({ ...prev, [urlId]: false }));
    }
  };

  const handleAuditAll = async () => {
    if (!domain || domain.urls.length === 0) return;
    setBatchAuditing(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/audit/domain/${domain.id}`, { method: 'POST' });
      const data = await res.json();
      setMessage(data.message || 'Auditorias iniciadas em segundo plano.');

      // Atualiza a cada 4 segundos durante a execução do lote
      const interval = setInterval(() => {
        fetchDomain();
      }, 4000);

      setTimeout(() => {
        clearInterval(interval);
        setBatchAuditing(false);
      }, 20000);
    } catch (err: any) {
      toast.error(err.message);
      setBatchAuditing(false);
    }
  };

  const handleDeleteUrl = async (urlId: number, urlStr: string) => {
    const confirmed = await confirm(`Excluir URL "${urlStr}" e todo o seu histórico de análises?`, {
      title: 'Excluir URL',
      confirmLabel: 'Excluir',
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/urls/${urlId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Erro ao excluir URL');
      }
      toast.success(`URL "${urlStr}" excluída.`);
      fetchDomain();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400 text-sm">Carregando detalhes do domínio...</div>;
  }

  if (!domain) {
    return (
      <div className="p-12 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <p className="text-rose-400 text-sm font-semibold">
          {error || 'Domínio não encontrado.'}
        </p>
        <div className="flex justify-center gap-3 pt-1">
          <button
            onClick={() => {
              setLoading(true);
              fetchDomain();
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs"
          >
            Tentar novamente
          </button>
          <Link
            to="/domains"
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs"
          >
            Voltar para Domínios
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <Link
        to="/domains"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para Domínios
      </Link>

      {/* Header do Domínio */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-yellow-400 px-2 py-0.5 rounded bg-yellow-400/10 border border-yellow-400/20">
              {domain.name}
            </span>
            <span className="text-xs text-slate-400">• {domain.urls.length} URLs cadastradas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {domain.label}
          </h1>
          {domain.description && (
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-xl">
              {domain.description}
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setIsUrlModalOpen(true)}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova URL
          </button>
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors"
          >
            <Layers className="w-4 h-4" /> Importar Lote
          </button>
          <button
            onClick={() => setIsSitemapModalOpen(true)}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors"
          >
            <FileCode className="w-4 h-4 text-yellow-400" /> Resgatar Sitemap
          </button>
          <button
            onClick={handleAuditAll}
            disabled={batchAuditing || domain.urls.length === 0}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-yellow-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Play className={`w-4 h-4 fill-slate-950 ${batchAuditing ? 'animate-spin' : ''}`} />
            {batchAuditing ? 'Auditando Domínio...' : 'Auditar Todas as URLs'}
          </button>
        </div>
      </div>

      {/* Barra de Progresso em Tempo Real */}
      <DomainAuditProgressBar
        domainId={domain.id}
        onFinished={() => {
          fetchDomain();
          setBatchAuditing(false);
        }}
      />

      {/* Lista de URLs */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-700/80 flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-yellow-400" /> URLs do Domínio ({domain.urls.length})
          </h2>
        </div>

        {domain.urls.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Link2 className="w-8 h-8 text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">Nenhuma URL cadastrada para este domínio</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Adicione links específicos ou importe uma lista completa de páginas para auditar.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                onClick={() => setIsUrlModalOpen(true)}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs"
              >
                Cadastrar URL
              </button>
              <button
                onClick={() => setIsBatchModalOpen(true)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs"
              >
                Importar em Massa
              </button>
              <button
                onClick={() => setIsSitemapModalOpen(true)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <FileCode className="w-3.5 h-3.5 text-yellow-400" /> Do Sitemap XML
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-bold text-[10px] border-b border-slate-700/60">
                <tr>
                  <th className="py-3.5 px-5">URL / Página</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Score YellowLab</th>
                  <th className="py-3.5 px-4">Última Auditoria</th>
                  <th className="py-3.5 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {domain.urls.map((u: any) => {
                  const isRunning = auditingUrls[u.id] || u.lastStatus === 'RUNNING';
                  const formattedDate = u.lastRunAt
                    ? new Date(u.lastRunAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Nunca';

                  return (
                    <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-white text-sm truncate max-w-sm">
                          {u.label || u.url}
                        </div>
                        <a
                          href={u.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-mono text-slate-400 hover:text-yellow-400 flex items-center gap-1 mt-0.5 truncate max-w-sm"
                        >
                          {u.url} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-900 text-slate-300 border border-slate-700">
                          {u.category || 'Geral'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                            isRunning
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              : u.lastStatus === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : u.lastStatus === 'FAILED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {isRunning ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" /> Auditando
                            </>
                          ) : u.lastStatus === 'SUCCESS' ? (
                            'Concluído'
                          ) : u.lastStatus === 'FAILED' ? (
                            'Falhou'
                          ) : (
                            'Pendente'
                          )}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <ScoreBadge score={u.lastScore} size="sm" />
                      </td>

                      <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">
                        {formattedDate}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAuditSingle(u.id)}
                            disabled={isRunning}
                            className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all disabled:opacity-50"
                            title="Executar auditoria imediata"
                          >
                            <Play className="w-3 h-3 fill-slate-950" />
                            {isRunning ? 'Auditando...' : 'Analisar'}
                          </button>

                          <Link
                            to={`/urls/${u.id}`}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg text-xs transition-colors"
                          >
                            Diagnóstico
                          </Link>

                          <button
                            onClick={() => handleDeleteUrl(u.id, u.url)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700 transition-colors"
                            title="Excluir URL"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UrlModal
        isOpen={isUrlModalOpen}
        onClose={() => setIsUrlModalOpen(false)}
        onSuccess={fetchDomain}
        domainId={domain.id}
        domainName={domain.name}
      />

      <BatchUrlModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onSuccess={fetchDomain}
        domainId={domain.id}
        domainName={domain.name}
        onOpenSitemap={() => setIsSitemapModalOpen(true)}
      />

      <SitemapImportModal
        isOpen={isSitemapModalOpen}
        onClose={() => setIsSitemapModalOpen(false)}
        onSuccess={fetchDomain}
        domainId={domain.id}
        domainName={domain.name}
      />
    </div>
  );
}
