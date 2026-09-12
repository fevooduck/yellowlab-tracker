import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Link2, Zap, ArrowRight, Activity, Plus, Search, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import ScoreBadge from '../components/ScoreBadge';
import DomainModal from '../components/DomainModal';

export default function DashboardPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [quickUrl, setQuickUrl] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const fetchDomains = async () => {
    try {
      const res = await fetch('/api/domains');
      const data = await res.json();
      setDomains(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const totalUrls = domains.reduce((acc, d) => acc + (d.totalUrls || 0), 0);
  const scoredDomains = domains.filter((d) => d.avgScore !== null);
  const globalAvg =
    scoredDomains.length > 0
      ? Math.round(
          scoredDomains.reduce((acc, d) => acc + d.avgScore, 0) / scoredDomains.length
        )
      : null;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-800/90 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Zap className="w-3.5 h-3.5" /> Performance & Qualidade de Código Front-End
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Central de Auditoria <span className="text-yellow-400">YellowLab</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
            Monitore a arquitetura de páginas, reduza a complexidade do DOM e de scripts, e gere planos de ação e checklists prontos para o <strong>Microsoft Planner</strong> do seu time.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={() => setIsDomainModalOpen(true)}
              className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-yellow-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Novo Domínio
            </button>
            <Link
              to="/urls"
              className="px-5 py-2.5 bg-slate-700/70 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 border border-slate-600 transition-colors"
            >
              <Link2 className="w-4 h-4" /> Ver Todas as URLs ({totalUrls})
            </Link>
          </div>
        </div>
      </div>

      {/* Métricas Globais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Domínios Monitorados
            </span>
            <span className="text-3xl font-black text-white mt-1 block">
              {domains.length}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total de URLs Cadastradas
            </span>
            <span className="text-3xl font-black text-white mt-1 block">
              {totalUrls}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Link2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Média Global de Saúde
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-3xl font-black text-white">
                {globalAvg !== null ? `${globalAvg}%` : '—'}
              </span>
              <ScoreBadge score={globalAvg} size="sm" />
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Lista de Domínios */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-yellow-400" /> Domínios Cadastrados
          </h2>
          <Link
            to="/domains"
            className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Carregando domínios...</div>
        ) : domains.length === 0 ? (
          <div className="p-12 bg-slate-800/40 border border-dashed border-slate-700 rounded-3xl text-center space-y-3">
            <Globe className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">Nenhum domínio cadastrado ainda</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Cadastre o host da sua aplicação para organizar e auditar suas URLs com o Yellow Lab Tools.
            </p>
            <button
              onClick={() => setIsDomainModalOpen(true)}
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Cadastrar Primeiro Domínio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domains.map((domain) => (
              <Link
                key={domain.id}
                to={`/domains/${domain.id}`}
                className="bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-5 transition-all group flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs font-mono font-bold text-yellow-400 truncate">
                      {domain.name}
                    </span>
                    <ScoreBadge score={domain.avgScore} size="sm" />
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-yellow-300 transition-colors">
                    {domain.label}
                  </h3>
                  {domain.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {domain.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                  <span>{domain.totalUrls} URLs cadastradas</span>
                  <span className="group-hover:text-white flex items-center gap-1 font-semibold transition-colors">
                    Acessar <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <DomainModal
        isOpen={isDomainModalOpen}
        onClose={() => setIsDomainModalOpen(false)}
        onSuccess={fetchDomains}
      />
    </div>
  );
}
