export interface ChartCaptures {
  timelineFunnel: string;
  timelineRevenue: string;
  budgetBreakdown: string;
  budgetCrossover: string;
  cohortsContribution: string | null;
}

async function captureElement(id: string): Promise<string | null> {
  const el = document.getElementById(id);
  if (!el) return null;

  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });
  return canvas.toDataURL('image/jpeg', 0.85);
}

export async function captureAllCharts(): Promise<ChartCaptures> {
  // Wait for Recharts SVG to finish rendering
  await new Promise(resolve => setTimeout(resolve, 300));

  const [timelineFunnel, timelineRevenue, budgetBreakdown, budgetCrossover, cohortsContribution] =
    await Promise.all([
      captureElement('pdf-chart-timeline-funnel'),
      captureElement('pdf-chart-timeline-revenue'),
      captureElement('pdf-chart-budget-breakdown'),
      captureElement('pdf-chart-budget-crossover'),
      captureElement('pdf-chart-cohorts-contribution'),
    ]);

  return {
    timelineFunnel: timelineFunnel || '',
    timelineRevenue: timelineRevenue || '',
    budgetBreakdown: budgetBreakdown || '',
    budgetCrossover: budgetCrossover || '',
    cohortsContribution,
  };
}
