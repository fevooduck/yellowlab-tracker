import React from 'react';

interface Props {
  score: number | null | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showGrade?: boolean;
}

export function getScoreGrade(score: number | null | undefined): {
  grade: string;
  color: string;
  bg: string;
  border: string;
  label: string;
} {
  if (score === null || score === undefined) {
    return {
      grade: '?',
      color: 'text-slate-400',
      bg: 'bg-slate-800',
      border: 'border-slate-700',
      label: 'Não Auditado',
    };
  }

  if (score >= 90) {
    return {
      grade: 'A',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      label: 'Excelente',
    };
  }
  if (score >= 80) {
    return {
      grade: 'B',
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/30',
      label: 'Bom',
    };
  }
  if (score >= 70) {
    return {
      grade: 'C',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      label: 'Atenção',
    };
  }
  if (score >= 50) {
    return {
      grade: 'D',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      label: 'Crítico',
    };
  }
  return {
    grade: 'F',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    label: 'Grave',
  };
}

export default function ScoreBadge({ score, size = 'md', showGrade = true }: Props) {
  const { grade, color, bg, border } = getScoreGrade(score);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-bold',
    md: 'text-sm px-2.5 py-1 font-extrabold',
    lg: 'text-base px-3.5 py-1.5 font-black',
    xl: 'text-2xl px-5 py-3 font-black rounded-2xl',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border ${bg} ${color} ${border} ${sizeClasses[size]}`}
    >
      {score !== null && score !== undefined ? `${score}` : '—'}
      {showGrade && score !== null && score !== undefined && (
        <span className="opacity-70 text-[0.8em]">({grade})</span>
      )}
    </span>
  );
}
