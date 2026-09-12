import React from 'react';
import { getScoreGrade } from './ScoreBadge';

interface Props {
  label: string;
  score: number | null | undefined;
  icon?: React.ReactNode;
  description?: string;
}

export default function ScoreGauge({ label, score, icon, description }: Props) {
  const { color, bg, border, grade } = getScoreGrade(score);
  const percent = score !== null && score !== undefined ? Math.max(0, Math.min(100, score)) : 0;

  return (
    <div className={`p-4 rounded-xl border ${bg} ${border} flex flex-col justify-between`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {icon && <div className={`${color}`}>{icon}</div>}
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {label}
          </span>
        </div>
        <span className={`text-lg font-black ${color}`}>
          {score !== null && score !== undefined ? `${score}` : '—'}
          <span className="text-[10px] ml-1 opacity-75">({grade})</span>
        </span>
      </div>

      {/* Barra de progresso visual */}
      <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            percent >= 80 ? 'bg-emerald-400' : percent >= 70 ? 'bg-yellow-400' : 'bg-rose-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {description && (
        <span className="text-[11px] text-slate-400 leading-tight">
          {description}
        </span>
      )}
    </div>
  );
}
