import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Globe, Search, Play, RefreshCw, ExternalLink, ArrowRight } from 'lucide-react';
import ScoreBadge from '../components/ScoreBadge';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';

export default function UrlsPage() {
  const { data, loading, request } = useApi<any[]>([]);
  const urls = Array.isArray(data) ? data : [];
  // Instância separada para as auditorias — evita que a resposta da ação
  // sobrescreva a lista de URLs guardada em `data`.
  const { request: requestAction } = useApi();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [auditingUrls, setAuditingUrls] = useState<Record<number, boolean>>({});

  const fetchUrls = async () => {
    try {
      await request('/api/urls');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    fetchUrls();
  }, []);

  const handleAuditSingle = async (urlId: number) => {
    setAuditingUrls((prev) => ({ ...prev, [urlId]: true }));
    try {
      await requestAction(`/api/audit/url/${urlId}`, { method: 'POST' });
      fetchUrls();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao auditar URL');
    } finally {
      setAuditingUrls((prev) => ({ ...prev, [urlId]: false }));
    }
  };

  const categories = Array.from(new Set(urls.map((u) => u.category || 'Geral')));

  const filtered = urls.filter((u) => {
    const matchesSearch =
      u.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.label && u.label.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.domain?.name && u.domain.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'ALL' || (u.category || 'Geral') === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Link2 className="w-6 h-6 text-yellow-400" /> Todas as URLs Monitoradas
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Visão consolidada de todas as páginas cadastradas nos domínios.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por URL, rótulo ou domínio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-yellow-400"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2 text-white text-xs font-bold focus:outline-none focus:border-yellow-400"
        >
          <option value="ALL">Todas as Categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela de URLs */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Carregando URLs...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Nenhuma URL encontrada com os filtros atuais.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-bold text-[10px] border-b border-slate-700/60">
                <tr>
                  <th className="py-3.5 px-5">Página / Domínio</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Score YellowLab</th>
                  <th className="py-3.5 px-4">Última Auditoria</th>
                  <th className="py-3.5 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {filtered.map((u) => {
                  const isRunning = auditingUrls[u.id] || u.lastStatus === 'RUNNING';
                  const dateStr = u.lastRunAt
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
                        <div className="font-bold text-white text-sm truncate max-w-md">
                          {u.label || u.url}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Link
                            to={`/domains/${u.domainId}`}
                            className="text-[11px] font-bold text-yellow-400/80 hover:text-yellow-300"
                          >
                            {u.domain?.name}
                          </Link>
                          <span className="text-slate-500">•</span>
                          <a
                            href={u.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center gap-1 truncate max-w-sm"
                          >
                            {u.url} <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-900 text-slate-300 border border-slate-700">
                          {u.category || 'Geral'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <ScoreBadge score={u.lastScore} size="sm" />
                      </td>

                      <td className="py-4 px-4 font-mono text-[11px] text-slate-400">
                        {dateStr}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAuditSingle(u.id)}
                            disabled={isRunning}
                            className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all disabled:opacity-50"
                          >
                            <Play className="w-3 h-3 fill-slate-950" />
                            {isRunning ? 'Auditando...' : 'Analisar'}
                          </button>

                          <Link
                            to={`/urls/${u.id}`}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors"
                          >
                            Diagnóstico <ArrowRight className="w-3 h-3" />
                          </Link>
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
    </div>
  );
}
