import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Clock, Globe, Zap } from 'lucide-react';

interface BatchProgressProps {
  domainId: number;
  onFinished?: () => void;
}

export function DomainAuditProgressBar({ domainId, onFinished }: BatchProgressProps) {
  const [status, setStatus] = useState<any | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    let timer: any;
    let pollInterval: any;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/audit/domain/${domainId}/status`);
        const data = await res.json();
        setStatus(data);

        if (!data.isRunning && data.processed > 0) {
          if (onFinished) onFinished();
          clearInterval(pollInterval);
        }
      } catch (e) {
        console.error('Erro ao verificar status do progresso:', e);
      }
    };

    checkStatus();
    pollInterval = setInterval(checkStatus, 1500);

    timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(timer);
    };
  }, [domainId]);

  if (!status || (!status.isRunning && status.processed === 0)) return null;

  const percent = status.percent || 0;
  const isComplete = !status.isRunning && status.processed >= status.total;

  return (
    <div className="bg-slate-800 border-2 border-yellow-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 space-y-4">
      {/* Header do Progresso */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-slate-950 shrink-0 ${
            isComplete ? 'bg-emerald-400' : 'bg-yellow-400'
          }`}>
            {isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-slate-950" />
            ) : (
              <RefreshCw className="w-5 h-5 text-slate-950 animate-spin" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              {isComplete ? '🎉 Auditoria do Domínio Concluída!' : 'Auditoria em Lote em Execução'}
            </h4>
            <p className="text-xs text-slate-400">
              {status.processed} de {status.total} URLs processadas ({percent}%)
            </p>
          </div>
        </div>

        {/* Badges de Contagem & Tempo */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {status.completed || 0} Sucesso
          </span>

          {(status.failed || 0) > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {status.failed} Falhas
            </span>
          )}

          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 border border-slate-700 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" /> {elapsedSec}s
          </span>
        </div>
      </div>

      {/* Barra de Progresso Visual */}
      <div className="space-y-1.5">
        <div className="w-full bg-slate-900 rounded-full h-3.5 p-0.5 overflow-hidden border border-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-500 relative overflow-hidden ${
              isComplete
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-amber-500 to-yellow-400'
            }`}
            style={{ width: `${Math.max(5, percent)}%` }}
          >
            {!isComplete && (
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>0%</span>
          <span className="text-xs font-bold text-white font-sans">{percent}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* URL atual em processamento */}
      {status.isRunning && status.currentUrl && (
        <div className="p-3 bg-slate-900/80 border border-slate-700/60 rounded-xl flex items-center gap-2.5 text-xs text-slate-300">
          <Globe className="w-4 h-4 text-yellow-400 shrink-0 animate-pulse" />
          <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider shrink-0">
            Analisando:
          </span>
          <span className="font-mono text-yellow-300 truncate max-w-xl">
            {status.currentUrl}
          </span>
        </div>
      )}
    </div>
  );
}

interface SingleAuditProgressProps {
  url: string;
  isLoading: boolean;
}

export function SingleAuditProgressBar({ url, isLoading }: SingleAuditProgressProps) {
  const [progress, setProgress] = useState(12);
  const [stage, setStage] = useState('Iniciando Chromium headless no container...');
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      return;
    }

    setProgress(12);
    setElapsedSec(0);
    setStage('Iniciando Chromium headless no container...');

    const timer = setInterval(() => {
      setElapsedSec((sec) => {
        const next = sec + 1;

        if (next < 4) {
          setProgress(Math.min(25, 12 + next * 4));
          setStage('Iniciando Chromium headless e conectando via DevTools...');
        } else if (next < 9) {
          setProgress(Math.min(50, 25 + (next - 4) * 5));
          setStage('Carregando HTML, disparando CSS, imagens e scripts da página...');
        } else if (next < 16) {
          setProgress(Math.min(72, 50 + (next - 9) * 3));
          setStage('Executando scripts, avaliando layout e renderização do DOM...');
        } else if (next < 24) {
          setProgress(Math.min(88, 72 + (next - 16) * 2));
          setStage('Analisando complexidade CSS, JavaScript e requisições...');
        } else {
          setProgress((prev) => Math.min(96, prev + 0.4));
          setStage('Calculando métricas do YellowLab e gerando Action Plan para desenvolvedores...');
        }

        return next;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="bg-slate-800/95 border-2 border-yellow-400/50 rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-top-2 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-yellow-400 text-slate-950 flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4 animate-spin" />
          </div>
          <div className="overflow-hidden">
            <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              Auditoria YellowLab em Andamento
            </h5>
            <p className="text-[11px] text-yellow-300 font-medium truncate mt-0.5">
              {stage}
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700 shrink-0 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {elapsedSec}s
        </span>
      </div>

      {/* Barra de Progresso */}
      <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-700">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-700 relative overflow-hidden"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span className="truncate max-w-md">{url}</span>
        <span className="font-bold text-white">{progress}%</span>
      </div>
    </div>
  );
}
