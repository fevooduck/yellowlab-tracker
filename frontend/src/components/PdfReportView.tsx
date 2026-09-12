import React from 'react';
import { Printer, CheckSquare, Zap, Wrench, Building2, Globe, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { getScoreGrade } from './ScoreBadge';

interface Props {
  report: {
    id: number;
    url: string;
    domainName: string;
    score: number | null;
    pageWeightScore: number | null;
    requestsScore: number | null;
    domScore: number | null;
    jsScore: number | null;
    cssScore: number | null;
    serverConfigScore: number | null;
    durationMs?: number;
    createdAt: string;
  };
  actionPlan: {
    currentScore: number;
    projectedQuickWinScore: number;
    projectedFullScore: number;
    quickWins: any[];
    mediumTasks: any[];
    structuralTasks: any[];
    totalIssuesCount: number;
    criticalCount: number;
  };
}

export default function PdfReportView({ report, actionPlan }: Props) {
  const { grade, color } = getScoreGrade(report.score);
  const formattedDate = new Date(report.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Botão de Ação (Oculto na Impressão) */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 flex items-center justify-between no-print shadow-xl">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-yellow-400" />
            Relatório de Entrega para Microsoft Planner
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Clique abaixo para exportar em PDF formatado com checklist para os desenvolvedores.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-yellow-500/20 transition-all active:scale-95"
        >
          <Printer className="w-4 h-4" />
          Imprimir / Salvar em PDF
        </button>
      </div>

      {/* DOCUMENTO DE IMPRESSÃO / PDF */}
      <div className="bg-white text-slate-900 rounded-3xl p-8 sm:p-12 shadow-2xl print:p-0 print:shadow-none print:rounded-none">
        {/* Cabeçalho */}
        <div className="border-b-2 border-slate-900 pb-6 mb-8 flex items-start justify-between gap-6">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">
              Yellow Lab Tools — Auditoria de Qualidade Front-End
            </div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight">
              Plano de Ação Técnica & Correções
            </h1>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-600 flex-wrap">
              <span className="flex items-center gap-1 font-semibold">
                <Globe className="w-3.5 h-3.5 text-slate-400" /> {report.domainName}
              </span>
              <span>•</span>
              <span className="font-mono text-slate-700 font-medium truncate max-w-md">
                {report.url}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> {formattedDate}
              </span>
              {report.durationMs && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {Math.round(report.durationMs / 1000)}s
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Score Global
            </div>
            <div className="text-4xl font-black text-slate-950 leading-none">
              {report.score}%
              <span className="text-xl ml-1 text-slate-500">({grade})</span>
            </div>
            <div className="text-[10px] font-bold mt-1 text-slate-500">
              Meta Quick Wins: {actionPlan.projectedQuickWinScore}%
            </div>
          </div>
        </div>

        {/* Radar das 6 Áreas */}
        <div className="mb-8 avoid-break">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
            1. Diagnóstico das 6 Áreas Front-End
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'DOM', score: report.domScore },
              { label: 'JavaScript', score: report.jsScore },
              { label: 'CSS', score: report.cssScore },
              { label: 'Requisições', score: report.requestsScore },
              { label: 'Peso da Página', score: report.pageWeightScore },
              { label: 'Servidor', score: report.serverConfigScore },
            ].map((cat, cIdx) => (
              <div
                key={cIdx}
                className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-center"
              >
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {cat.label}
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {cat.score !== null ? `${cat.score}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ⚡ 1. QUICK WINS (PLANNER CHECKLIST) */}
        {actionPlan.quickWins.length > 0 && (
          <div className="mb-8 avoid-break">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h2 className="text-base font-black text-slate-900">
                ⚡ 2. Quick Wins — Vitórias Rápidas (1 a 2 dias)
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                (Ações com alto impacto na nota e baixo risco de regressão)
              </span>
            </div>

            <div className="space-y-4">
              {actionPlan.quickWins.map((item, qIdx) => (
                <div
                  key={qIdx}
                  className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 avoid-break"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded border-2 border-slate-400 flex items-center justify-center text-xs mt-0.5 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            {item.category}
                          </span>
                          <span className="text-xs font-bold text-rose-600">
                            Nota: {item.score}/100
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            • {item.value}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 mt-1">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                          {item.problemSummary}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Resolução */}
                  <div className="mt-3 pl-8 text-xs text-slate-700">
                    <span className="font-bold text-slate-900 block mb-1">Como resolver no código:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                      {item.howToFix.map((fix: string, fIdx: number) => (
                        <li key={fIdx}>{fix}</li>
                      ))}
                    </ul>

                    {item.topOffenders.length > 0 && (
                      <div className="mt-2 text-[11px] text-slate-500 font-mono bg-white p-2 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-700 font-sans block mb-1">
                          Ofensores identificados:
                        </span>
                        {item.topOffenders.map((off: any, oIdx: number) => (
                          <div key={oIdx} className="truncate">
                            • {off.label} {off.metric ? `(${off.metric})` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🛠️ 2. OTIMIZAÇÕES MÉDIAS */}
        {actionPlan.mediumTasks.length > 0 && (
          <div className="mb-8 avoid-break">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
              <Wrench className="w-5 h-5 text-sky-600" />
              <h2 className="text-base font-black text-slate-900">
                🛠️ 3. Otimizações de Código (Esforço Médio)
              </h2>
            </div>

            <div className="space-y-4">
              {actionPlan.mediumTasks.map((item, mIdx) => (
                <div
                  key={mIdx}
                  className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 avoid-break"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded border-2 border-slate-400 flex items-center justify-center text-xs mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          {item.category}
                        </span>
                        <span className="text-xs font-bold text-rose-600">
                          Nota: {item.score}/100
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1">
                        {item.problemSummary}
                      </p>
                      <div className="mt-2 text-xs text-slate-700">
                        {item.howToFix.map((fix: string, fIdx: number) => (
                          <div key={fIdx} className="text-slate-600">
                            ✔ {fix}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🏗️ 3. MUDANÇAS ESTRUTURAIS */}
        {actionPlan.structuralTasks.length > 0 && (
          <div className="mb-8 avoid-break">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-black text-slate-900">
                🏗️ 4. Melhorias Estruturais & Arquitetura (Sprint Planning)
              </h2>
            </div>

            <div className="space-y-4">
              {actionPlan.structuralTasks.map((item, sIdx) => (
                <div
                  key={sIdx}
                  className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 avoid-break"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded border-2 border-slate-400 flex items-center justify-center text-xs mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          {item.category}
                        </span>
                        <span className="text-xs font-bold text-rose-600">
                          Nota: {item.score}/100
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1">
                        {item.problemSummary}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rodapé do PDF */}
        <div className="border-t border-slate-200 pt-4 mt-8 flex items-center justify-between text-[11px] text-slate-400">
          <span>Gerado automaticamente pelo YellowLab Tracker</span>
          <span>Anexo de Entrega — Microsoft Planner</span>
        </div>
      </div>
    </div>
  );
}
