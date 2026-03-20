import type jsPDF from 'jspdf';
import type { ChartCaptures } from './chartCapture';
import type { TimelineAnalysis, BudgetAnalysis, CohortAnalysis, DataAnalysis, StageHealth } from './recommendations';
import type { CalculatorOutputs, QuarterlyOutput } from '../engine/types';

const MARGIN = 15;
const CONTENT_W = 210 - 2 * MARGIN;
const TEAL = { r: 29, g: 226, b: 196 };

// Health colors for infographic boxes
const HEALTH_COLORS: Record<StageHealth, { bg: [number, number, number]; border: [number, number, number]; text: [number, number, number] }> = {
  strong: { bg: [220, 252, 231], border: [34, 197, 94], text: [22, 101, 52] },
  typical: { bg: [254, 249, 195], border: [234, 179, 8], text: [113, 63, 18] },
  underperforming: { bg: [254, 226, 226], border: [239, 68, 68], text: [127, 29, 29] },
};

const TRAFFIC_COLORS: Record<string, { bg: [number, number, number]; border: [number, number, number]; text: [number, number, number] }> = {
  green: { bg: [220, 252, 231], border: [34, 197, 94], text: [22, 101, 52] },
  amber: { bg: [254, 249, 195], border: [234, 179, 8], text: [113, 63, 18] },
  red: { bg: [254, 226, 226], border: [239, 68, 68], text: [127, 29, 29] },
};

function addImage(doc: jsPDF, dataUrl: string, y: number, sourceW: number, sourceH: number): number {
  if (!dataUrl) return y;
  const displayW = CONTENT_W;
  const displayH = (displayW / sourceW) * sourceH;
  doc.addImage(dataUrl, 'JPEG', MARGIN, y, displayW, displayH);
  return y + displayH;
}

function drawBox(doc: jsPDF, x: number, y: number, w: number, h: number, colors: { bg: [number, number, number]; border: [number, number, number] }): void {
  doc.setFillColor(...colors.bg);
  doc.setDrawColor(...colors.border);
  doc.setLineWidth(0.5);
  doc.rect(x, y, w, h, 'FD');
}

function drawInsightBox(doc: jsPDF, y: number, text: string): number {
  doc.setDrawColor(TEAL.r, TEAL.g, TEAL.b);
  doc.setLineWidth(1.5);
  doc.line(MARGIN, y, MARGIN, y + 16);
  doc.setFontSize(10);
  doc.setTextColor(17, 17, 17);
  const lines = doc.splitTextToSize(text, CONTENT_W - 8);
  doc.text(lines, MARGIN + 6, y + 5);
  return y + Math.max(18, lines.length * 5 + 6);
}

function drawRecommendations(doc: jsPDF, y: number, recs: string[]): number {
  doc.setFontSize(11);
  doc.setTextColor(17, 17, 17);
  doc.text('Recommendations', MARGIN, y);
  y += 8;

  recs.forEach((rec, i) => {
    doc.setFillColor(TEAL.r, TEAL.g, TEAL.b);
    doc.circle(MARGIN + 3, y - 1.5, 2.5, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`${i + 1}`, MARGIN + 1.8, y - 0.5);

    doc.setFontSize(9);
    doc.setTextColor(55, 55, 55);
    const lines = doc.splitTextToSize(rec, CONTENT_W - 12);
    doc.text(lines, MARGIN + 9, y);
    y += lines.length * 4.5 + 5;
  });

  return y;
}

// ============================================================
// PAGE 5: Timeline Chart (LEFT)
// ============================================================
export function addTimelineChartPage(doc: jsPDF, captures: ChartCaptures): void {
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text('Timeline to Revenue', MARGIN, 25);
  doc.setFontSize(9);
  doc.setTextColor(107, 107, 107);
  doc.text('Funnel volume and cumulative revenue progression', MARGIN, 33);

  let y = 40;
  y = addImage(doc, captures.timelineFunnel, y, 800, 400);
  y += 4;
  y = addImage(doc, captures.timelineRevenue, y, 800, 320);
}

// ============================================================
// PAGE 6: Timeline Analysis (RIGHT)
// ============================================================
export function addTimelineAnalysisPage(doc: jsPDF, analysis: TimelineAnalysis): void {
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text('Timeline Analysis', MARGIN, 25);
  doc.setFontSize(9);
  doc.setTextColor(107, 107, 107);
  doc.text('Stage-by-stage funnel health assessment', MARGIN, 33);

  let y = 42;

  // Stage health boxes (4 across)
  const boxW = (CONTENT_W - 9) / 4; // 3 gaps of 3mm
  analysis.stages.forEach((stage, i) => {
    const x = MARGIN + i * (boxW + 3);
    const colors = HEALTH_COLORS[stage.health];
    drawBox(doc, x, y, boxW, 32, colors);

    doc.setFontSize(7);
    doc.setTextColor(...colors.text);
    doc.text(stage.stage, x + 3, y + 6);

    doc.setFontSize(14);
    doc.text(`${(stage.userRate * 100).toFixed(0)}%`, x + 3, y + 16);

    doc.setFontSize(6);
    doc.text(`vs ${(stage.benchmarkRate * 100).toFixed(0)}% benchmark`, x + 3, y + 22);

    doc.setFontSize(7);
    const label = stage.health === 'strong' ? 'STRONG' : stage.health === 'typical' ? 'ON TRACK' : 'NEEDS WORK';
    doc.text(label, x + 3, y + 28);
  });
  y += 40;

  // Investment period bar
  doc.setFontSize(9);
  doc.setTextColor(17, 17, 17);
  doc.text('Investment Timeline', MARGIN, y);
  y += 6;

  const totalQ = Math.max(analysis.investmentPeriodQuarters + 2, 4);
  const barW = CONTENT_W / totalQ;
  for (let q = 0; q < totalQ; q++) {
    const x = MARGIN + q * barW;
    if (q < analysis.investmentPeriodQuarters) {
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(234, 179, 8);
    } else {
      doc.setFillColor(220, 252, 231); // green-100
      doc.setDrawColor(34, 197, 94);
    }
    doc.setLineWidth(0.3);
    doc.rect(x, y, barW - 1, 8, 'FD');
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 80);
    doc.text(`Q${q + 1}`, x + barW / 2 - 3, y + 5.5);
  }
  y += 12;

  doc.setFontSize(7);
  doc.setTextColor(107, 107, 107);
  doc.setFillColor(254, 243, 199);
  doc.rect(MARGIN, y, 4, 4, 'F');
  doc.text('Investment Period', MARGIN + 6, y + 3.5);
  doc.setFillColor(220, 252, 231);
  doc.rect(MARGIN + 50, y, 4, 4, 'F');
  doc.text('Revenue Generation', MARGIN + 56, y + 3.5);
  y += 12;

  // Key insight
  y = drawInsightBox(doc, y, analysis.keyInsight);
  y += 6;

  // Velocity indicator
  doc.setFontSize(9);
  doc.setTextColor(17, 17, 17);
  doc.text('Sales Velocity', MARGIN, y);
  y += 7;
  doc.setFontSize(11);
  doc.text(`${analysis.velocityDays} days`, MARGIN, y);
  if (analysis.velocityImprovement > 0) {
    doc.setFontSize(8);
    doc.setTextColor(34, 197, 94);
    doc.text(`  ${analysis.velocityImprovement} days faster than baseline`, MARGIN + 25, y);
  }
  y += 12;

  // Recommendations
  drawRecommendations(doc, y, analysis.recommendations);
}

// ============================================================
// PAGE 7: Budget Chart (LEFT)
// ============================================================
export function addBudgetChartPage(doc: jsPDF, captures: ChartCaptures): void {
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text('Budget & Investment', MARGIN, 25);
  doc.setFontSize(9);
  doc.setTextColor(107, 107, 107);
  doc.text('Quarterly cost breakdown and cumulative investment vs. revenue', MARGIN, 33);

  let y = 40;
  y = addImage(doc, captures.budgetBreakdown, y, 800, 400);
  y += 4;
  y = addImage(doc, captures.budgetCrossover, y, 800, 320);
}

// ============================================================
// PAGE 8: Budget Analysis (RIGHT)
// ============================================================
export function addBudgetAnalysisPage(doc: jsPDF, analysis: BudgetAnalysis): void {
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text('Budget Analysis', MARGIN, 25);
  doc.setFontSize(9);
  doc.setTextColor(107, 107, 107);
  doc.text('Investment allocation and unit economics assessment', MARGIN, 33);

  let y = 42;

  // Budget allocation horizontal stacked bar
  doc.setFontSize(9);
  doc.setTextColor(17, 17, 17);
  doc.text('Budget Allocation', MARGIN, y);
  y += 6;

  const barH = 12;
  const segments = [
    { label: 'Frequency', pct: analysis.allocation.frequency.percent, color: [59, 130, 246] as [number, number, number] },
    { label: 'CPL', pct: analysis.allocation.cpl.percent, color: [6, 182, 212] as [number, number, number] },
    { label: 'Software', pct: analysis.allocation.software.percent, color: [139, 92, 246] as [number, number, number] },
    { label: 'Agency', pct: analysis.allocation.agency.percent, color: [245, 158, 11] as [number, number, number] },
  ];

  let barX = MARGIN;
  segments.forEach(seg => {
    const segW = Math.max(CONTENT_W * seg.pct, 0);
    doc.setFillColor(...seg.color);
    doc.rect(barX, y, segW, barH, 'F');
    barX += segW;
  });
  y += barH + 4;

  // Legend
  segments.forEach((seg, i) => {
    const lx = MARGIN + i * 44;
    doc.setFillColor(...seg.color);
    doc.rect(lx, y, 4, 4, 'F');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(`${seg.label} ${(seg.pct * 100).toFixed(0)}%`, lx + 6, y + 3.5);
  });
  y += 14;

  // Unit Economics traffic lights
  doc.setFontSize(9);
  doc.setTextColor(17, 17, 17);
  doc.text('Unit Economics', MARGIN, y);
  y += 6;

  const ueBoxW = (CONTENT_W - 6) / 3;
  const ueMetrics = [
    { label: 'LTV:CAC', status: analysis.unitEconHealth },
    { label: 'Freq:CPL', value: `${analysis.frequencyToCPLRatio.toFixed(1)}x`, status: analysis.frequencyToCPLRatio > 10 ? 'amber' : 'green' },
    { label: 'ROI', value: `${(analysis.roi * 100).toFixed(0)}%`, status: analysis.roi > 0 ? 'green' : analysis.roi > -0.5 ? 'amber' : 'red' },
  ];
  ueMetrics.forEach((m, i) => {
    const x = MARGIN + i * (ueBoxW + 3);
    const colors = TRAFFIC_COLORS[m.status as string] || TRAFFIC_COLORS.green;
    drawBox(doc, x, y, ueBoxW, 22, colors);
    doc.setFontSize(7);
    doc.setTextColor(...colors.text);
    doc.text(m.label, x + 3, y + 6);
    doc.setFontSize(12);
    doc.text(m.value || m.status.toUpperCase(), x + 3, y + 16);
  });
  y += 30;

  // Crossover
  doc.setFontSize(9);
  doc.setTextColor(17, 17, 17);
  doc.text('Revenue Crossover', MARGIN, y);
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(analysis.crossoverQuarter
    ? `Cumulative revenue exceeds cumulative cost at ${analysis.crossoverQuarter}.`
    : 'Revenue has not exceeded investment within the modeled horizon.',
    MARGIN, y);
  y += 12;

  // Key insight
  y = drawInsightBox(doc, y, analysis.keyInsight);
  y += 6;

  // Recommendations
  drawRecommendations(doc, y, analysis.recommendations);
}

// ============================================================
// PAGE 9: Cohorts Chart (LEFT)
// ============================================================
export function addCohortsChartPage(doc: jsPDF, captures: ChartCaptures, outputs: CalculatorOutputs): void {
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text('Cohort Analysis', MARGIN, 25);
  doc.setFontSize(9);
  doc.setTextColor(107, 107, 107);
  doc.text('Performance breakdown by cohort', MARGIN, 33);

  let y = 40;

  if (captures.cohortsContribution) {
    y = addImage(doc, captures.cohortsContribution, y, 800, 400);
    y += 6;
  }

  // Per-cohort summary table
  doc.setFontSize(9);
  doc.setTextColor(17, 17, 17);
  doc.text('Cohort Summary', MARGIN, y);
  y += 7;

  const cols = ['Cohort', 'Profile', 'Accounts', 'Deals', 'Revenue', 'Cost/Deal'];
  const colW = CONTENT_W / cols.length;
  doc.setFontSize(7);
  doc.setTextColor(107, 107, 107);
  cols.forEach((c, i) => doc.text(c, MARGIN + i * colW, y));
  y += 5;

  doc.setTextColor(17, 17, 17);
  outputs.cohorts.slice(0, 5).forEach(co => {
    const deals = co.totals.closedWon;
    const costPerDeal = deals > 0 ? co.totals.totalCost / deals : 0;
    const vals = [
      co.cohortName,
      co.profileId.toUpperCase(),
      co.quarterlyData[0]?.accountState.newAccounts?.toString() || '0',
      deals.toFixed(1),
      `$${Math.round(co.totals.revenue).toLocaleString()}`,
      deals > 0 ? `$${Math.round(costPerDeal).toLocaleString()}` : '\u2014',
    ];
    vals.forEach((v, i) => doc.text(v, MARGIN + i * colW, y));
    y += 6;
  });
}

// ============================================================
// PAGE 10: Cohorts Analysis (RIGHT)
// ============================================================
export function addCohortsAnalysisPage(doc: jsPDF, analysis: CohortAnalysis): void {
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text('Cohort Performance', MARGIN, 25);
  doc.setFontSize(9);
  doc.setTextColor(107, 107, 107);
  doc.text('Comparative cohort analysis and recommendations', MARGIN, 33);

  let y = 42;

  // Cohort comparison boxes
  const boxW = analysis.cohortBreakdown.length <= 3
    ? (CONTENT_W - (analysis.cohortBreakdown.length - 1) * 3) / analysis.cohortBreakdown.length
    : (CONTENT_W - 6) / 3;

  analysis.cohortBreakdown.slice(0, 3).forEach((c, i) => {
    const x = MARGIN + i * (boxW + 3);
    const isBest = c.name === analysis.bestPerformer;
    const borderColor: [number, number, number] = isBest ? [34, 197, 94] : [209, 213, 219];
    const bgColor: [number, number, number] = isBest ? [240, 253, 244] : [249, 250, 251];

    doc.setFillColor(...bgColor);
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(isBest ? 1 : 0.3);
    doc.rect(x, y, boxW, 50, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(17, 17, 17);
    doc.text(c.name, x + 3, y + 8);
    doc.setFontSize(7);
    doc.setTextColor(107, 107, 107);
    doc.text(c.profile, x + 3, y + 14);

    doc.setFontSize(8);
    doc.setTextColor(55, 55, 55);
    doc.text(`${c.accounts} accounts`, x + 3, y + 22);
    doc.text(`${c.deals.toFixed(1)} deals`, x + 3, y + 28);
    doc.text(`$${Math.round(c.revenue).toLocaleString()} rev`, x + 3, y + 34);
    doc.text(`$${Math.round(c.costPerDeal).toLocaleString()}/deal`, x + 3, y + 40);
    doc.text(`${(c.contribution * 100).toFixed(0)}% of total`, x + 3, y + 46);

    if (isBest) {
      doc.setFontSize(6);
      doc.setTextColor(34, 197, 94);
      doc.text('BEST CPD', x + boxW - 18, y + 8);
    }
  });
  y += 58;

  // Revenue contribution bars
  if (analysis.cohortBreakdown.length > 1) {
    doc.setFontSize(9);
    doc.setTextColor(17, 17, 17);
    doc.text('Revenue Contribution', MARGIN, y);
    y += 6;

    const COHORT_BAR_COLORS: [number, number, number][] = [
      [59, 130, 246], [16, 185, 129], [245, 158, 11], [139, 92, 246], [236, 72, 153],
    ];

    analysis.cohortBreakdown.slice(0, 5).forEach((c, i) => {
      const barMaxW = CONTENT_W - 50;
      const barW = barMaxW * c.contribution;
      doc.setFillColor(...(COHORT_BAR_COLORS[i % COHORT_BAR_COLORS.length]));
      doc.rect(MARGIN + 45, y, barW, 6, 'F');
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text(c.name, MARGIN, y + 4.5);
      doc.text(`${(c.contribution * 100).toFixed(0)}%`, MARGIN + 48 + barW, y + 4.5);
      y += 9;
    });
    y += 4;
  }

  // Key insight
  y = drawInsightBox(doc, y, analysis.keyInsight);
  y += 6;

  // Recommendations
  drawRecommendations(doc, y, analysis.recommendations);
}

// ============================================================
// PAGE 11: Data Summary (LEFT)
// ============================================================
export function addDataSummaryPage(doc: jsPDF, outputs: CalculatorOutputs): void {
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text('Quarterly Data Summary', MARGIN, 25);
  doc.setFontSize(9);
  doc.setTextColor(107, 107, 107);
  doc.text('Complete quarterly breakdown of funnel metrics and costs', MARGIN, 33);

  const { quarterly, summary } = outputs;

  let y = 42;
  doc.setFontSize(7);
  const headers = ['Quarter', 'Leads', 'MQLs', 'Opps', 'Won', 'Revenue', 'Total Cost'];
  const colW = CONTENT_W / headers.length;
  doc.setTextColor(107, 107, 107);
  headers.forEach((h, i) => doc.text(h, MARGIN + i * colW, y));
  y += 5;

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  y += 3;

  doc.setTextColor(17, 17, 17);
  quarterly.forEach((q) => {
    if (y > 268) return;
    const vals = [
      q.quarterLabel,
      q.leads.toFixed(0),
      q.mqls.toFixed(0),
      q.opportunities.toFixed(0),
      q.closedWon.toFixed(1),
      `$${Math.round(q.revenue).toLocaleString()}`,
      `$${Math.round(q.totalCost).toLocaleString()}`,
    ];
    vals.forEach((v, j) => doc.text(v, MARGIN + j * colW, y));
    y += 7;
  });

  // Totals row
  y += 2;
  doc.setDrawColor(229, 231, 235);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  y += 5;
  doc.setFontSize(7);
  doc.setTextColor(17, 17, 17);
  const totals = [
    'TOTAL',
    summary.totalLeads.toFixed(0),
    '', // MQLs total not directly on summary
    '',
    summary.totalClosedWon.toFixed(1),
    `$${Math.round(summary.totalRevenue).toLocaleString()}`,
    `$${Math.round(summary.totalInvestment).toLocaleString()}`,
  ];
  totals.forEach((v, j) => doc.text(v, MARGIN + j * colW, y));
}

// ============================================================
// PAGE 12: Data Analysis (RIGHT)
// ============================================================
export function addDataAnalysisPage(doc: jsPDF, analysis: DataAnalysis): void {
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text('Data Analysis', MARGIN, 25);
  doc.setFontSize(9);
  doc.setTextColor(107, 107, 107);
  doc.text('Key trends and performance indicators', MARGIN, 33);

  let y = 42;

  // 4 metric boxes (2x2 grid)
  const metricBoxW = (CONTENT_W - 4) / 2;
  const metrics = [
    { label: 'Total Leads', value: Math.round(analysis.totalLeads).toLocaleString() },
    { label: 'Total Deals', value: analysis.totalDeals.toFixed(1) },
    { label: 'Avg Quarterly Revenue', value: `$${Math.round(analysis.avgQuarterlyRevenue).toLocaleString()}` },
    { label: 'Peak Revenue Quarter', value: `${analysis.peakQuarter} ($${Math.round(analysis.peakRevenue).toLocaleString()})` },
  ];

  metrics.forEach((m, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = MARGIN + col * (metricBoxW + 4);
    const boxY = y + row * 28;

    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.rect(x, boxY, metricBoxW, 24, 'FD');

    doc.setFontSize(7);
    doc.setTextColor(107, 107, 107);
    doc.text(m.label, x + 4, boxY + 8);
    doc.setFontSize(13);
    doc.setTextColor(17, 17, 17);
    doc.text(m.value, x + 4, boxY + 18);
  });
  y += 62;

  // Growth indicator
  doc.setFontSize(9);
  doc.setTextColor(17, 17, 17);
  doc.text('Lead Volume Trend', MARGIN, y);
  y += 7;
  const growthPct = (analysis.quarterOverQuarterGrowth * 100).toFixed(0);
  const isGrowing = analysis.quarterOverQuarterGrowth >= 0;
  doc.setFontSize(11);
  doc.setTextColor(isGrowing ? 34 : 239, isGrowing ? 197 : 68, isGrowing ? 94 : 68);
  doc.text(`${isGrowing ? '+' : ''}${growthPct}% ${isGrowing ? 'growth' : 'decline'} (first to last quarter)`, MARGIN, y);
  y += 14;

  // Model confidence note
  doc.setFontSize(8);
  doc.setTextColor(107, 107, 107);
  const confNote = 'These projections assume sustained marketing investment with no gaps in campaign activity. Any interruption resets funnel momentum and requires rebuilding. Actual results will vary based on execution quality, market conditions, and content bridge completeness.';
  const confLines = doc.splitTextToSize(confNote, CONTENT_W);
  doc.text(confLines, MARGIN, y);
  y += confLines.length * 4.5 + 10;

  // Key insight
  y = drawInsightBox(doc, y, analysis.keyInsight);
  y += 6;

  // Recommendations
  drawRecommendations(doc, y, analysis.recommendations);
}
