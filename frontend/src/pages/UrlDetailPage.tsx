import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Globe, ExternalLink, Play, RefreshCw, Calendar, Clock,
  Layers, CheckSquare, GitCompare, Code2, AlertTriangle, TrendingUp, TrendingDown
} from 'lucide-react';
import ScoreBadge from '../components/ScoreBadge';
import ScoreGauge from '../components/ScoreGauge';
import ActionPlanTabs from '../components/ActionPlanTabs';
import PdfReportView from '../components/PdfReportView';
import { SingleAuditProgressBar } from '../components/AuditProgressBar';
import { useToast } from '../components/Toast';

export default function UrlDetailPage() {
  const { urlId } = useParams<{ urlId: string }>();
  const toast = useToast();
  const [urlData, setUrlData] = useState<any | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [reportDetails, setReportDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'plannerPdf' | 'diff' | 'rawJson'>('plan');
  const [diffData, setDiffData] = useState<any | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUrlDetails = async () => {
    try {
      const res = await fetch(`/api/urls/${urlId}`);
      const data = await res.json();

      if (!res.ok) {
        setUrlData(null);
        setError(data?.error || `Erro ao carregar URL (HTTP ${res.status})`);
        return;
      }

      setUrlData(data);
      setError(null);

      if (data.reports && data.reports.length > 0) {
        setSelectedReportId(data.reports[0].id);
      }
    } catch (err: any) {
      setUrlData(null);
      setError(err?.message || 'Falha de conexão ao buscar a URL.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportDetails = async (reportId: number) => {
    setReportLoading(true);
    try {
      const res = await fetch(`/api/audit/report/${reportId}`);
      const data = await res.json();
      setReportDetails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    fetchUrlDetails();
  }, [urlId]);

  useEffect(() => {
    if (selectedReportId) {
      fetchReportDetails(selectedReportId);
    }
  }, [selectedReportId]);

  const handleRunAudit = async () => {
    setAuditing(true);
    try {
      const res = await fetch(`/api/audit/url/${urlId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao executar auditoria');
      await fetchUrlDetails();
      if (data.report?.id) {
        setSelectedReportId(data.report.id);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAuditing(false);
    }
  };

  // Carrega comparador (Diff) se houver pelo menos 2 relatórios
  const loadDiff = async () => {
    if (!urlData?.reports || urlData.reports.length < 2) return;
    setDiffLoading(true);
    try {
      const newId = urlData.reports[0].id;
      const oldId = urlData.reports[1].id;
      const res = await fetch(`/api/audit/diff/${oldId}/${newId}`);
      const data = await res.json();
      setDiffData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDiffLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'diff') {
      loadDiff();
    }
  }, [activeTab]);

  if (loading) {
    return <div className="p-12 text-center text-slate-400 text-sm">Carregando detalhes da URL...</div>;
  }

  if (!urlData) {
    return (
      <div className="p-12 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
        <p className="text-rose-400 text-sm font-semibold">
          {error || 'URL não encontrada.'}
        </p>
        <div className="flex justify-center gap-3 pt-1">
          <button
            onClick={() => {
              setLoading(true);
              fetchUrlDetails();
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs"
          >
            Tentar novamente
          </button>
          <Link
            to="/urls"
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs"
          >
            Voltar para URLs
          </Link>
        </div>
      </div>
    );
  }

  const latestReport = reportDetails?.report || null;
  const actionPlan = reportDetails?.actionPlan || null;

  return (
    <div className="space-y-6">
      {/* Botão Voltar (Oculto na Impressão) */}
      <Link
        to={`/domains/${urlData.domainId}`}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors no-print"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para {urlData.domain?.label || 'Domínio'}
      </Link>

      {/* Header da URL (Oculto na Impressão) */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl no-print">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 uppercase tracking-wider">
              {urlData.category || 'Geral'}
            </span>
            <Link
              to={`/domains/${urlData.domainId}`}
              className="text-xs font-bold text-yellow-400 hover:underline flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5" /> {urlData.domain?.name}
            </Link>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {urlData.label || urlData.url}
          </h1>

          <a
            href={urlData.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-slate-400 hover:text-yellow-400 inline-flex items-center gap-1 mt-1 truncate max-w-xl transition-colors"
          >
            {urlData.url} <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Score & Ação */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              Última Nota
            </span>
            <ScoreBadge score={urlData.lastScore} size="lg" />
          </div>

          <button
            onClick={handleRunAudit}
            disabled={auditing}
            className="px-5 py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-yellow-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {auditing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Auditando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" /> Executar Auditoria
              </>
            )}
          </button>
        </div>
      </div>

      {/* Barra de Progresso em Tempo Real (Auditoria Individual) */}
      <SingleAuditProgressBar
        url={urlData.url}
        isLoading={auditing}
      />

      {/* Histórico de Execuções e Seletor de Relatório */}
      {urlData.reports && urlData.reports.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-print">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Histórico:
          </span>
          {urlData.reports.map((rep: any, idx: number) => {
            const dateStr = new Date(rep.createdAt).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });
            const isSelected = selectedReportId === rep.id;

            return (
              <button
                key={rep.id}
                onClick={() => setSelectedReportId(rep.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{idx === 0 ? 'Última' : `#${rep.id}`} ({dateStr})</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                  isSelected ? 'bg-slate-950 text-yellow-400' : 'bg-slate-900 text-slate-300'
                }`}>
                  {rep.score}%
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Se não houver relatório executado ainda */}
      {(!urlData.reports || urlData.reports.length === 0) && (
        <div className="bg-slate-800/60 border border-dashed border-slate-700 rounded-3xl p-12 text-center space-y-4">
          <Play className="w-12 h-12 text-yellow-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Nenhuma auditoria realizada nesta URL</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Dispare a primeira análise para carregar o diagnóstico completo de DOM, scripts, CSS e gerar o plano de ação.
          </p>
          <button
            onClick={handleRunAudit}
            disabled={auditing}
            className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-yellow-500/20 inline-flex items-center gap-2"
          >
            {auditing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
            {auditing ? 'Executando Auditoria...' : 'Iniciar Primeira Auditoria'}
          </button>
        </div>
      )}

      {/* Conteúdo da Auditoria Selecionada */}
      {latestReport && (
        <div className="space-y-6">
          {/* As 6 Dimensões Front-End (Oculto na Impressão) */}
          <div className="no-print">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Saúde da Arquitetura Front-End (6 Dimensões)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <ScoreGauge
                label="Complexidade DOM"
                score={latestReport.domScore}
                description="Árvore e inserções"
              />
              <ScoreGauge
                label="Qualidade JavaScript"
                score={latestReport.jsScore}
                description="Scripts e complexidade"
              />
              <ScoreGauge
                label="Complexidade CSS"
                score={latestReport.cssScore}
                description="Seletores e regras"
              />
              <ScoreGauge
                label="Requisições HTTP"
                score={latestReport.requestsScore}
                description="Contagem e tipos"
              />
              <ScoreGauge
                label="Peso da Página"
                score={latestReport.pageWeightScore}
                description="Bytes transferidos"
              />
              <ScoreGauge
                label="Config. Servidor"
                score={latestReport.serverConfigScore}
                description="Compressão e headers"
              />
            </div>
          </div>

          {/* Abas Principais (Oculto na Impressão) */}
          <div className="border-b border-slate-700 pb-2 flex items-center gap-2 no-print">
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'plan'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4 text-yellow-400" />
              Plano de Ação Técnica (Dev-First)
            </button>

            <button
              onClick={() => setActiveTab('plannerPdf')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'plannerPdf'
                  ? 'bg-yellow-400 text-slate-950 font-black shadow-lg shadow-yellow-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              Exportar para Microsoft Planner (PDF)
            </button>

            {urlData.reports && urlData.reports.length >= 2 && (
              <button
                onClick={() => setActiveTab('diff')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'diff'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <GitCompare className="w-4 h-4 text-sky-400" />
                Comparativo (Evolução / Diff)
              </button>
            )}

            <button
              onClick={() => setActiveTab('rawJson')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'rawJson'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Code2 className="w-4 h-4 text-slate-400" />
              JSON Bruto
            </button>
          </div>

          {/* Renderização da Aba Selecionada */}
          {reportLoading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Carregando dados da auditoria...</div>
          ) : (
            <>
              {activeTab === 'plan' && actionPlan && (
                <ActionPlanTabs plan={actionPlan} fullReportJson={latestReport.fullJson} />
              )}

              {activeTab === 'plannerPdf' && actionPlan && (
                <PdfReportView report={latestReport} actionPlan={actionPlan} />
              )}

              {activeTab === 'diff' && (
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <GitCompare className="w-5 h-5 text-sky-400" />
                        Comparativo Entre as Duas Últimas Auditorias
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Valide se o último deploy melhorou a nota ou se causou regressão técnica.
                      </p>
                    </div>
                  </div>

                  {diffLoading ? (
                    <div className="p-8 text-center text-slate-400 text-xs">Calculando diff...</div>
                  ) : diffData ? (
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-700">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Variação Geral do Score
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-3xl font-black text-white">
                              {diffData.oldReport.score}% → {diffData.newReport.score}%
                            </span>
                            <span
                              className={`text-sm font-black px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                                diffData.scoreDiff > 0
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : diffData.scoreDiff < 0
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {diffData.scoreDiff > 0 ? (
                                <>
                                  <TrendingUp className="w-4 h-4" /> +{diffData.scoreDiff}%
                                </>
                              ) : diffData.scoreDiff < 0 ? (
                                <>
                                  <TrendingDown className="w-4 h-4" /> {diffData.scoreDiff}%
                                </>
                              ) : (
                                'Sem alteração'
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(diffData.categoriesDiff).map(([catKey, diffVal]: [string, any]) => (
                          <div key={catKey} className="p-3 bg-slate-900/40 border border-slate-700/80 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              {catKey}
                            </span>
                            <span className={`text-base font-black mt-1 block ${
                              diffVal > 0 ? 'text-emerald-400' : diffVal < 0 ? 'text-rose-400' : 'text-slate-400'
                            }`}>
                              {diffVal > 0 ? `+${diffVal}%` : `${diffVal}%`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {activeTab === 'rawJson' && (
                <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 p-6">
                  <pre className="text-xs font-mono text-emerald-400 overflow-x-auto max-h-[600px] leading-relaxed">
                    {JSON.stringify(latestReport.fullJson, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
