import React, { useState } from 'react';
import { X, Code2, AlertTriangle, Check, Copy, FileText, Info } from 'lucide-react';
import { getScoreGrade } from './ScoreBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: {
    ruleKey: string;
    title: string;
    category: string;
    score: number;
    value: string;
    effort: string;
    problemSummary: string;
    howToFix: string[];
    codeSnippet?: string;
    topOffenders: Array<{ label: string; detail?: string; metric?: string }>;
  } | null;
  rawRuleData?: any;
}

export default function OffendersModal({ isOpen, onClose, item, rawRuleData }: Props) {
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  if (!isOpen || !item) return null;

  const { grade, color, bg, border } = getScoreGrade(item.score);

  const handleCopyOffender = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopySnippet = (snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 bg-slate-800/60 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-12 h-12 rounded-2xl border ${bg} ${border} ${color} flex items-center justify-center font-black text-xl shadow-lg shrink-0`}
            >
              {grade}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300 uppercase tracking-wider">
                  {item.category}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  Nota: {item.score}/100
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-1 leading-snug">
                {item.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 py-2 border-b border-slate-700/60 bg-slate-900/40 flex items-center gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('visual')}
            className={`py-2 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'visual'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Detalhamento & Código
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`py-2 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'json'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" /> Dados Brutos (JSON)
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {activeTab === 'visual' ? (
            <>
              {/* Diagnóstico */}
              <div className="bg-slate-900/70 border border-slate-700/80 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                  <AlertTriangle className="w-4 h-4" /> Diagnóstico do Problema
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {item.problemSummary}
                </p>
                <div className="mt-2 text-xs font-mono text-slate-400">
                  Métrica medida: <span className="text-white font-bold">{item.value}</span>
                </div>
              </div>

              {/* Ofensores */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  Arquivos / Seletores Ofensores ({item.topOffenders.length})
                </h4>

                {item.topOffenders.length > 0 ? (
                  <div className="space-y-2">
                    {item.topOffenders.map((off, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3 group hover:border-slate-600 transition-colors"
                      >
                        <div className="overflow-hidden">
                          <code className="text-xs font-mono text-yellow-300 block truncate">
                            {off.label}
                          </code>
                          {off.detail && (
                            <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                              {off.detail}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {off.metric && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {off.metric}
                            </span>
                          )}
                          <button
                            onClick={() => handleCopyOffender(off.label, idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Copiar ofensor"
                          >
                            {copiedIndex === idx ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-900/40 border border-dashed border-slate-700 rounded-xl text-center text-slate-400 text-xs">
                    Nenhum arquivo individual listado. Trata-se de uma métrica agregada da página.
                  </div>
                )}
              </div>

              {/* Guia de Resolução */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Como Corrigir no Código
                </h4>
                <ul className="space-y-2 mb-4">
                  {item.howToFix.map((step, sIdx) => (
                    <li
                      key={sIdx}
                      className="text-slate-300 text-xs flex items-start gap-2 leading-relaxed"
                    >
                      <span className="text-emerald-400 font-bold shrink-0">✔</span>
                      {step}
                    </li>
                  ))}
                </ul>

                {item.codeSnippet && (
                  <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                    <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        Exemplo de Código / Configuração
                      </span>
                      <button
                        onClick={() => handleCopySnippet(item.codeSnippet!)}
                        className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 font-semibold"
                      >
                        {copiedSnippet ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copiar Código
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                      {item.codeSnippet}
                    </pre>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
              <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed max-h-96">
                {JSON.stringify(rawRuleData || item, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/80 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Utilize este diagnóstico para alimentar suas tarefas no Microsoft Planner.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
