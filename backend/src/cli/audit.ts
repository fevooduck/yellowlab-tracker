import { runYellowLabAudit } from '../lib/ylt-runner.js';
import { buildDeveloperActionPlan } from '../lib/action-plan.js';

async function runCli() {
  const url = process.argv[2];
  if (!url) {
    console.error('❌ Uso: npm run audit <URL> [mobile|desktop]');
    process.exit(1);
  }

  const device = (process.argv[3] as 'mobile' | 'desktop') || 'mobile';

  console.log(`\n========================================`);
  console.log(`🔍 Auditoria Yellow Lab Tools`);
  console.log(`URL: ${url}`);
  console.log(`Device: ${device}`);
  console.log(`========================================\n`);

  const result = await runYellowLabAudit(url, device);

  if (!result.success) {
    console.error(`\n❌ Falha na auditoria: ${result.error}`);
    process.exit(1);
  }

  const plan = buildDeveloperActionPlan(result.reportJson, result.score ?? 0);

  console.log(`\n📊 RESULTADOS:`);
  console.log(`----------------------------------------`);
  console.log(`🏆 Score Geral: ${result.score}/100`);
  console.log(`📦 Page Weight Score: ${result.pageWeightScore}/100`);
  console.log(`🌐 Requests Score: ${result.requestsScore}/100`);
  console.log(`🌲 DOM Score: ${result.domScore}/100`);
  console.log(`⚡ JavaScript Score: ${result.jsScore}/100`);
  console.log(`🎨 CSS Score: ${result.cssScore}/100`);
  console.log(`🖥️  Server Config Score: ${result.serverConfigScore}/100`);
  console.log(`⏱️  Duração: ${result.durationMs}ms`);

  console.log(`\n⚡ QUICK WINS IDENTIFICADOS (${plan.quickWins.length}):`);
  plan.quickWins.forEach((qw) => {
    console.log(`  • [${qw.category}] ${qw.title} - Nota: ${qw.score}/100`);
    console.log(`    Problema: ${qw.problemSummary}`);
    if (qw.topOffenders.length > 0) {
      console.log(`    Ofensores: ${qw.topOffenders.map((o) => o.label).join(', ')}`);
    }
  });

  console.log(`\n🛠️  TAREFAS DE MÉDIO ESFORÇO (${plan.mediumTasks.length}):`);
  plan.mediumTasks.forEach((mt) => {
    console.log(`  • [${mt.category}] ${mt.title} - Nota: ${mt.score}/100`);
  });

  console.log(`\n🏗️  MUDANÇAS ESTRUTURAIS (${plan.structuralTasks.length}):`);
  plan.structuralTasks.forEach((st) => {
    console.log(`  • [${st.category}] ${st.title} - Nota: ${st.score}/100`);
  });

  console.log(`\n🎯 Projeção de Nota após Quick Wins: ${plan.projectedQuickWinScore}%`);
  console.log(`🚀 Projeção de Nota Global: ${plan.projectedFullScore}%\n`);
}

runCli().catch((err) => {
  console.error(err);
  process.exit(1);
});
