import React, { useState } from 'react';
import { Zap, Wrench, Building2, ChevronRight, TrendingUp, AlertCircle } from 'lucide-react';
import { getScoreGrade } from './ScoreBadge';
import OffendersModal from './OffendersModal';

interface Props {
  plan: {
    currentScore: number;
    projectedQuickWinScore: number;
    projectedFullScore: number;
    quickWins: any[];
    mediumTasks: any[];
    structuralTasks: any[];
    totalIssuesCount: number;
    criticalCount: number;
  };
  fullReportJson?: any;
}

export default function ActionPlanTabs({ plan, fullReportJson }: Props) {
  const [activeTab, setActiveTab] = useState<'quickWins' | 'medium' | 'structural'>('quickWins');
  const [selectedRuleItem, setSelectedRuleItem] = useState<any | null>(null);

  const currentList =
    activeTab === 'quickWins'
      ? plan.quickWins
      : activeTab === 'medium'
      ? plan.mediumTasks
      : plan.structuralTasks;

  return (
    <div className="space-y-6">
      {/* Cards de Projeção de Nota para Desenvolvedores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Score Atual
            </span>
            <span className="text-2xl font-black text-white mt-1 block">
              {plan.currentScore}%
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              {plan.criticalCount} Críticos
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider block flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> Meta Quick Wins
            </span>
            <span className="text-2xl font-black text-yellow-300 mt-1 block">
              {plan.projectedQuickWinScore}%
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +{plan.projectedQuickWinScore - plan.currentScore}%
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Meta Global (Sprint)
            </span>
            <span className="text-2xl font-black text-emerald-300 mt-1 block">
              {plan.projectedFullScore}%
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +{plan.projectedFullScore - plan.currentScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Abas de Navegação */}
      <div className="flex items-center gap-2 border-b border-slate-700/80 pb-3">
        <button
          onClick={() => setActiveTab('quickWins')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
            activeTab === 'quickWins'
              ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-500/20'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Zap className="w-4 h-4" />
          ⚡ Quick Wins ({plan.quickWins.length})
        </button>

        <button
          onClick={() => setActiveTab('medium')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
            activeTab === 'medium'
              ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-500/20'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4" />
          🛠️ Otimizações Médias ({plan.mediumTasks.length})
        </button>

        <button
          onClick={() => setActiveTab('structural')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
            activeTab === 'structural'
              ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-500/20'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          🏗️ Mudanças Estruturais ({plan.structuralTasks.length})
        </button>
      </div>

      {/* Lista de Ações do Nível Selecionado */}
      <div className="space-y-3">
        {currentList.length === 0 ? (
          <div className="p-8 bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl text-center">
            <span className="text-emerald-400 font-bold block mb-1">
              🎉 Nenhum problema detectado nesta categoria!
            </span>
            <span className="text-xs text-slate-400">
              Todos os critérios avaliados estão acima da meta de 80 pontos.
            </span>
          </div>
        ) : (
          currentList.map((item, idx) => {
            const { grade, color, bg, border } = getScoreGrade(item.score);

            return (
              <div
                key={idx}
                onClick={() => setSelectedRuleItem(item)}
                className="bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-4 transition-all cursor-pointer group flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl border ${bg} ${border} ${color} flex items-center justify-center font-black text-base shrink-0 group-hover:scale-105 transition-transform`}
                  >
                    {grade}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-300 uppercase tracking-wider">
                        {item.category}
                      </span>
                      <span className="text-xs font-extrabold text-slate-400">
                        Nota: {item.score}/100
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-xs font-mono text-yellow-400/90 font-medium">
                        {item.value}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mt-1 group-hover:text-yellow-300 transition-colors">
                      {item.title}
                    </h4>

                    <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                      {item.problemSummary}
                    </p>

                    {item.topOffenders && item.topOffenders.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Ofensores:
                        </span>
                        {item.topOffenders.slice(0, 2).map((off: any, oIdx: number) => (
                          <span
                            key={oIdx}
                            className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-slate-300 truncate max-w-xs"
                          >
                            {off.label}
                          </span>
                        ))}
                        {item.topOffenders.length > 2 && (
                          <span className="text-[10px] text-slate-400">
                            +{item.topOffenders.length - 2} outros
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400 group-hover:text-yellow-400 shrink-0 self-center transition-colors">
                  <span className="text-xs font-bold hidden sm:inline">Ver Solução</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Detalhamento do Ofensor */}
      {selectedRuleItem && (
        <OffendersModal
          isOpen={Boolean(selectedRuleItem)}
          onClose={() => setSelectedRuleItem(null)}
          item={selectedRuleItem}
          rawRuleData={fullReportJson?.rules?.[selectedRuleItem.ruleKey]}
        />
      )}
    </div>
  );
}
