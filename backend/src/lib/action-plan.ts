import { RULE_KNOWLEDGE_BASE, EffortLevel, RuleMeta } from './knowledge-base.js';

export interface ActionPlanItem {
  ruleKey: string;
  title: string;
  category: string;
  score: number;
  value: string;
  effort: EffortLevel;
  impactWeight: number;
  problemSummary: string;
  howToFix: string[];
  codeSnippet?: string;
  topOffenders: Array<{ label: string; detail?: string; metric?: string }>;
}

export interface DeveloperActionPlan {
  currentScore: number;
  projectedQuickWinScore: number;
  projectedFullScore: number;
  quickWins: ActionPlanItem[];
  mediumTasks: ActionPlanItem[];
  structuralTasks: ActionPlanItem[];
  totalIssuesCount: number;
  criticalCount: number;
}

export function buildDeveloperActionPlan(
  fullData: any,
  fallbackScore: number = 0
): DeveloperActionPlan {
  const currentScore = fullData?.scoreProfiles?.generic?.globalScore ?? fallbackScore;
  const allRules = fullData?.rules || {};

  const items: ActionPlanItem[] = [];

  Object.entries(allRules as Record<string, any>).forEach(([ruleKey, rule]) => {
    if (!rule || rule.score === undefined || rule.score >= 80) return;

    const meta: RuleMeta = RULE_KNOWLEDGE_BASE[ruleKey] || {
      title: rule.policy?.label || ruleKey,
      category: 'Qualidade Geral',
      effort: rule.score < 50 ? 'MEDIUM' : 'QUICK_WIN',
      impactWeight: rule.score < 30 ? 3 : 2,
      formatValue: (val: any) => String(val),
      problemSummary: () =>
        rule.policy?.message
          ? rule.policy.message.replace(/<[^>]*>?/gm, ' ')
          : 'Critério com nota abaixo das diretrizes de excelência front-end.',
      howToFix: [
        'Inspecione os arquivos e seletores ofensores detalhados e reduza a complexidade correspondente.'
      ]
    };

    let topOffenders: Array<{ label: string; detail?: string; metric?: string }> = [];

    if (meta.extractOffenders && (rule.offendersObj || rule.offenders)) {
      try {
        topOffenders = meta.extractOffenders(rule.offendersObj || rule.offenders);
      } catch (e) {
        topOffenders = [];
      }
    } else if (Array.isArray(rule.offendersObj) && rule.offendersObj.length > 0) {
      topOffenders = rule.offendersObj.slice(0, 5).map((item: any) => ({
        label:
          typeof item === 'string'
            ? item
            : item.url || item.css || item.selector || JSON.stringify(item).slice(0, 60),
        detail: item.url || undefined,
        metric: item.count
          ? `${item.count}x`
          : item.size
          ? `${Math.round(item.size / 1024)} KB`
          : undefined
      }));
    }

    const formattedValue = meta.formatValue ? meta.formatValue(rule.value) : String(rule.value);

    items.push({
      ruleKey,
      title: meta.title,
      category: meta.category,
      score: rule.score,
      value: formattedValue,
      effort: meta.effort,
      impactWeight: meta.impactWeight,
      problemSummary: meta.problemSummary(rule.value),
      howToFix: meta.howToFix,
      codeSnippet: meta.codeSnippet,
      topOffenders
    });
  });

  // Ordena por nota crescente (piores notas primeiro)
  items.sort((a, b) => a.score - b.score);

  const quickWins = items.filter((r) => r.effort === 'QUICK_WIN');
  const mediumTasks = items.filter((r) => r.effort === 'MEDIUM');
  const structuralTasks = items.filter((r) => r.effort === 'STRUCTURAL');

  // Projeção estimada de aumento de nota
  const quickWinGain = Math.min(
    35,
    Math.round(quickWins.reduce((acc, r) => acc + (100 - r.score) * 0.15, 0))
  );
  const projectedQuickWinScore = Math.min(100, currentScore + quickWinGain);

  const mediumGain = Math.min(
    25,
    Math.round(mediumTasks.reduce((acc, r) => acc + (100 - r.score) * 0.12, 0))
  );
  const structuralGain = Math.min(
    20,
    Math.round(structuralTasks.reduce((acc, r) => acc + (100 - r.score) * 0.1, 0))
  );
  const projectedFullScore = Math.min(
    100,
    Math.max(
      projectedQuickWinScore,
      currentScore + quickWinGain + mediumGain + structuralGain
    )
  );

  const criticalCount = items.filter((r) => r.score < 50).length;

  return {
    currentScore,
    projectedQuickWinScore,
    projectedFullScore,
    quickWins,
    mediumTasks,
    structuralTasks,
    totalIssuesCount: items.length,
    criticalCount
  };
}
