import type jsPDF from 'jspdf';
import type { CalculatorInputs, SummaryMetrics, UnitEconomicsMetrics, CohortOutput } from '../engine/types';
import { UNIT_ECONOMICS_THRESHOLDS, CAMPAIGN_PROFILES } from '../engine/defaults';
import { interpolateASPScaling } from '../engine/asp-scaling';
import type { TrafficLightStatus } from '../engine/types';

export function getUnitEconLabel(metric: string, value: number): string {
  const t = UNIT_ECONOMICS_THRESHOLDS;
  let status: TrafficLightStatus;
  if (metric === 'ltvCac') status = value >= t.ltvCac.green ? 'green' : value >= t.ltvCac.amber ? 'amber' : 'red';
  else if (metric === 'cacPayback') status = value <= t.cacPaybackMonths.green ? 'green' : value <= t.cacPaybackMonths.amber ? 'amber' : 'red';
  else status = value <= t.newCacRatio.green ? 'green' : value <= t.newCacRatio.amber ? 'amber' : 'red';

  const labels: Record<TrafficLightStatus, string> = { green: 'HEALTHY', amber: 'WATCH', red: 'AT RISK' };
  return labels[status];
}

const PAGE_W = 210;
const MARGIN = 20;
const CONTENT_W = PAGE_W - 2 * MARGIN;

export function addCoverPage(doc: jsPDF, firstName: string, company: string): void {
  doc.setFontSize(28);
  doc.setTextColor(17, 17, 17);
  doc.text('Funnel Velocity Analysis', MARGIN, 50);
  doc.setFontSize(12);
  doc.setTextColor(107, 107, 107);
  if (firstName) doc.text(`Prepared for ${firstName}`, MARGIN, 65);
  if (company) doc.text(company, MARGIN, 75);
  doc.text(new Date().toLocaleDateString(), MARGIN, company ? 85 : 75);
  doc.setFontSize(10);
  doc.text('strategnik.com', MARGIN, 260);
}

export function addExecutiveSummaryPage(doc: jsPDF, summary: SummaryMetrics, unitEconomics: UnitEconomicsMetrics): void {
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text('Executive Summary', MARGIN, 30);

  doc.setFontSize(11);
  doc.setTextColor(107, 107, 107);
  const summaryLines = [
    `First Revenue: ${summary.firstRevenueQuarterLabel}`,
    `Total Investment: $${Math.round(summary.totalInvestment).toLocaleString()}`,
    `Total Revenue: $${Math.round(summary.totalRevenue).toLocaleString()}`,
    `True CPL: $${Math.round(summary.trueCPL).toLocaleString()}`,
    `Effective CAC: $${Math.round(summary.effectiveCAC).toLocaleString()}`,
    `ROI: ${(summary.roi * 100).toFixed(0)}%`,
    `Progress to Goal: ${(summary.progressToGoal * 100).toFixed(0)}%`,
    `Sales Velocity: ${Math.round(summary.currentSalesVelocity)} days`,
    `Days Saved: ${Math.round(summary.daysSavedVsBaseline)} days`,
    '',
    `LTV:CAC Ratio: ${unitEconomics.ltvCacRatio.toFixed(1)}:1 [${getUnitEconLabel('ltvCac', unitEconomics.ltvCacRatio)}]`,
    `CAC Payback: ${Math.round(unitEconomics.cacPaybackMonths)} months [${getUnitEconLabel('cacPayback', unitEconomics.cacPaybackMonths)}]`,
    `New CAC Ratio: $${unitEconomics.newCacRatio.toFixed(2)} per $1 ARR [${getUnitEconLabel('newCacRatio', unitEconomics.newCacRatio)}]`,
  ];
  summaryLines.forEach((line, i) => {
    doc.text(line, MARGIN, 50 + i * 12);
  });
}

export function addHowB2BWorksPage(doc: jsPDF): void {
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text('How B2B Marketing Actually Works', MARGIN, 30);

  let y = 48;

  doc.setFontSize(12);
  doc.setTextColor(17, 17, 17);
  doc.text('The Trigger Model', MARGIN, y);
  y += 10;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const triggerText = 'Every dollar spent on B2B marketing performs one function: it triggers a prospect to seek more information. Not to buy. Not to talk to sales. To look something up. A display ad triggers a Google search. A cold email triggers a visit to a competitor comparison page. A conference booth triggers a case study download.';
  const triggerLines = doc.splitTextToSize(triggerText, CONTENT_W);
  doc.text(triggerLines, MARGIN, y);
  y += triggerLines.length * 4.5 + 6;

  doc.setFontSize(10);
  doc.setTextColor(17, 17, 17);
  doc.text('TRIGGER  \u2192  INFORMATION SEEKING  \u2192  SALES CONVERSATION', MARGIN, y);
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(107, 107, 107);
  doc.text('(Marketing dollars)       (Prospect researches)         (Only after bridge is crossed)', MARGIN, y);
  y += 12;

  doc.setFontSize(9);
  doc.setTextColor(146, 64, 14);
  const bridgeWarning = 'Without case studies, reviews, product descriptions, explainers, and competitive content in-market, triggers become expensive noise with no follow-up.';
  const bridgeLines = doc.splitTextToSize(bridgeWarning, CONTENT_W);
  doc.text(bridgeLines, MARGIN, y);
  y += bridgeLines.length * 4.5 + 10;

  doc.setFontSize(12);
  doc.setTextColor(17, 17, 17);
  doc.text('Sustained Presence vs. Campaign Spikes', MARGIN, y);
  y += 10;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const sustainedText = 'Sustained Presence: Consistent trigger activity across all quarters. Gradually rising conversion. Revenue compounds. The funnel builds hydraulic pressure over time.\n\nCampaign Spikes: Sharp activity bursts with near-zero between. Conversion never builds momentum. Brand awareness resets. Prospects move to competitors who stayed present.';
  const sustainedLines = doc.splitTextToSize(sustainedText, CONTENT_W);
  doc.text(sustainedLines, MARGIN, y);
  y += sustainedLines.length * 4.5 + 8;

  doc.setFontSize(8);
  doc.setTextColor(107, 107, 107);
  const hydraulicText = 'Marketing is not a rifle \u2014 it\'s a hydraulic system. Sustained pressure moves accounts through the funnel. Turn the pump off and pressure resets to zero. You don\'t resume from where you stopped; you rebuild from scratch.';
  const hydraulicLines = doc.splitTextToSize(hydraulicText, CONTENT_W);
  doc.text(hydraulicLines, MARGIN, y);
  y += hydraulicLines.length * 4.5 + 10;

  doc.setFontSize(10);
  doc.setTextColor(17, 17, 17);
  doc.text('What This Report Shows', MARGIN, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const contextText = 'The data on the following pages models what to expect when you begin sustained marketing investment. The projected lag between spending and revenue is the characteristic shape of B2B sales cycles when marketing dollars function as triggers, not direct revenue generators. The numbers assume sustained investment and a functional information bridge.';
  const contextLines = doc.splitTextToSize(contextText, CONTENT_W);
  doc.text(contextLines, MARGIN, y);
  y += contextLines.length * 4.5 + 10;

  doc.setFontSize(10);
  doc.setTextColor(17, 17, 17);
  doc.text('Information Bridge Readiness Checklist', MARGIN, y);
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const checklist = [
    ['\u25A1  Category Awareness', '"What is this category?" \u2192 Analyst reports, explainers, comparison pages'],
    ['\u25A1  Product Understanding', '"What does this do?" \u2192 Product pages, architecture diagrams, demo videos'],
    ['\u25A1  Social Proof', '"Has anyone like me used this?" \u2192 Case studies, G2/Gartner reviews, customer logos'],
    ['\u25A1  Competitive Positioning', '"How is this different?" \u2192 Competitive teardowns, migration guides'],
    ['\u25A1  Internal Justification', '"How do I get approval?" \u2192 Business case templates, ROI frameworks'],
  ];
  checklist.forEach(([label, desc]) => {
    doc.setTextColor(17, 17, 17);
    doc.text(label, MARGIN, y);
    y += 4;
    doc.setTextColor(107, 107, 107);
    const descLines = doc.splitTextToSize(desc, CONTENT_W - 5);
    doc.text(descLines, MARGIN + 5, y);
    y += descLines.length * 4 + 4;
  });

  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(146, 64, 14);
  const checklistFooter = 'Every unchecked row is a leak in your funnel. The conversion rates in this report assume all five categories are addressed.';
  const footerLines = doc.splitTextToSize(checklistFooter, CONTENT_W);
  doc.text(footerLines, MARGIN, y);
}

export function addYourInputsPage(doc: jsPDF, inputs: CalculatorInputs): void {
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text('Your Inputs', MARGIN, 30);
  doc.setFontSize(8);
  doc.setTextColor(107, 107, 107);
  doc.text(`Configuration date: ${new Date().toLocaleDateString()}`, MARGIN, 38);

  const aspScaling = interpolateASPScaling(inputs.goals.averageSellingPrice);

  let y = 50;
  const col1 = MARGIN;
  const col2 = 112;

  doc.setFontSize(10);
  doc.setTextColor(17, 17, 17);
  doc.text('Goals & Economics', col1, y);
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const goalLines = [
    `ARR Goal: $${Math.round(inputs.goals.arrGoal).toLocaleString()}`,
    `Average Selling Price: $${Math.round(inputs.goals.averageSellingPrice).toLocaleString()}`,
    `Model Horizon: ${inputs.simulationQuarters} quarters`,
    `Start: Q${inputs.startQ} ${inputs.startYear}`,
  ];
  goalLines.forEach((line, i) => {
    doc.text(line, col1, y + i * 6);
  });
  y += goalLines.length * 6 + 2;

  doc.setFontSize(7);
  doc.setTextColor(59, 130, 246);
  doc.text(`ASP Band: ${aspScaling.bandLabel}`, col1 + 3, y);
  y += 4;
  doc.text(`Scaling: Win ${aspScaling.oppToCloseAdj.toFixed(2)}\u00D7 | Velocity ${aspScaling.salesVelocityDays}d | MQL\u2192Opp ${aspScaling.mqlToOppAdj.toFixed(2)}\u00D7 | Lead\u2192MQL ${aspScaling.leadToMQLAdj.toFixed(2)}\u00D7`, col1 + 3, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(17, 17, 17);
  doc.text(`Cohorts (${inputs.cohorts.length})`, col1, y);
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  inputs.cohorts.forEach((cohort) => {
    const profile = CAMPAIGN_PROFILES[cohort.profileId];
    doc.text(`${cohort.name}: ${cohort.totalAccounts} accounts \u00B7 ${cohort.profileId.toUpperCase()} \u00B7 Q+${cohort.startQuarter}`, col1, y);
    y += 5;
    doc.setFontSize(7);
    doc.setTextColor(107, 107, 107);
    const rates = profile.conversionRates;
    doc.text(`  A\u2192L ${(rates.accountToLead * 100).toFixed(0)}% | L\u2192MQL ${(rates.leadToMQL * 100).toFixed(0)}% | MQL\u2192Opp ${(rates.mqlToOpp * 100).toFixed(0)}% | Opp\u2192Close ${(rates.oppToClose * 100).toFixed(0)}%`, col1, y);
    y += 4;
    const vel = profile.velocityDistribution.new;
    doc.text(`  Velocity dist: ${vel.map(v => `${(v * 100).toFixed(0)}%`).join(' / ')}`, col1, y);
    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
  });

  let yRight = 50;
  doc.setFontSize(10);
  doc.setTextColor(17, 17, 17);
  doc.text('Budget', col2, yRight);
  yRight += 8;
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const budgetLines = [
    `Blended CPL: $${inputs.budget.blendedCPL}${inputs.userOverrides?.blendedCPL ? ' (custom)' : ' (ASP-adjusted)'}`,
    `Monthly Frequency: ${inputs.budget.frequencyConfig.monthlyFrequency} touches`,
    `Cost per Touch: $${inputs.budget.frequencyConfig.costPerTouch.toFixed(2)}`,
    `Quarterly Software: $${Math.round(inputs.budget.softwareCostPerQuarter).toLocaleString()}`,
    `Content Production: ${inputs.budget.inHouseCreative ? 'In-House (12%)' : `Outsourced (${(inputs.budget.agencyPercent * 100).toFixed(0)}%)`}`,
  ];
  budgetLines.forEach((line, i) => {
    doc.text(line, col2, yRight + i * 6);
  });

  yRight += budgetLines.length * 6 + 6;
  doc.setFontSize(10);
  doc.setTextColor(17, 17, 17);
  doc.text('Advanced', col2, yRight);
  yRight += 8;
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const advancedLines = [
    `Sales Velocity: ${inputs.advanced.salesVelocityDays}d${inputs.userOverrides?.salesVelocityDays ? ' (custom)' : ' (ASP-adjusted)'}`,
    `Quarterly Dropout: ${(inputs.advanced.quarterlyDropoutRate * 100).toFixed(0)}%`,
    `Max Velocity Improvement: ${(inputs.advanced.maxVelocityImprovement * 100).toFixed(0)}%`,
  ];
  advancedLines.forEach((line, i) => {
    doc.text(line, col2, yRight + i * 6);
  });
}

export function addCohortDetailPages(doc: jsPDF, cohortOutputs: CohortOutput[]): void {
  const cohortsToShow = cohortOutputs.slice(0, 3);

  cohortsToShow.forEach((cohortOut, cohortIdx) => {
    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(17, 17, 17);
    doc.text(`Cohort Detail: ${cohortOut.cohortName}`, MARGIN, 30);

    doc.setFontSize(9);
    doc.setTextColor(107, 107, 107);
    const profile = CAMPAIGN_PROFILES[cohortOut.profileId];
    doc.text(`Profile: ${profile.label} | ${cohortOut.quarterlyData[0]?.accountState.newAccounts || 0} accounts`, MARGIN, 39);

    if (cohortIdx > 0) {
      doc.setFontSize(8);
      doc.setTextColor(146, 64, 14);
      doc.text('Later cohorts benefit from the information bridge built by earlier cohorts.', MARGIN, 46);
    }

    const cohortTableStart = cohortIdx > 0 ? 54 : 48;
    doc.setFontSize(7);
    const cohortHeaders = ['Quarter', 'Active', 'Leads', 'MQLs', 'Opps', 'Won', 'Revenue', 'Cost'];
    const cohortColW = 21.5;
    cohortHeaders.forEach((h, i) => {
      doc.setTextColor(107, 107, 107);
      doc.text(h, MARGIN + i * cohortColW, cohortTableStart);
    });

    cohortOut.quarterlyData.forEach((qd, qi) => {
      const rowY = cohortTableStart + 7 + qi * 7;
      if (rowY > 260) return;
      if (qd.accountState.totalActive === 0 && qd.leads === 0 && qd.revenue === 0) return;

      doc.setTextColor(17, 17, 17);
      const cohortVals = [
        qd.quarterLabel,
        Math.round(qd.accountState.totalActive).toString(),
        qd.leads.toFixed(0),
        qd.mqls.toFixed(0),
        qd.opportunities.toFixed(0),
        qd.closedWon.toFixed(1),
        `$${Math.round(qd.revenue).toLocaleString()}`,
        `$${Math.round(qd.totalCost).toLocaleString()}`,
      ];
      cohortVals.forEach((v, j) => doc.text(v, MARGIN + j * cohortColW, rowY));
    });

    let lifecycleY = cohortTableStart + 7 + Math.min(cohortOut.quarterlyData.length, 28) * 7 + 10;
    if (lifecycleY > 240) lifecycleY = 240;

    doc.setFontSize(9);
    doc.setTextColor(17, 17, 17);
    doc.text('Cohort Totals', MARGIN, lifecycleY);
    lifecycleY += 8;
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const totals = cohortOut.totals;
    const cohortTotalLines = [
      `Leads: ${totals.leads.toFixed(0)} | MQLs: ${totals.mqls.toFixed(0)} | Opps: ${totals.opportunities.toFixed(0)} | Won: ${totals.closedWon.toFixed(1)}`,
      `Revenue: $${Math.round(totals.revenue).toLocaleString()} | Cost: $${Math.round(totals.totalCost).toLocaleString()}`,
    ];
    cohortTotalLines.forEach(line => {
      doc.text(line, MARGIN, lifecycleY);
      lifecycleY += 6;
    });
  });
}

export function addAssumptionsPage(doc: jsPDF, summary: SummaryMetrics): void {
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text('Assumptions & Methodology', MARGIN, 30);

  let y = 48;
  doc.setFontSize(8);
  doc.setTextColor(107, 107, 107);
  const disclaimer = 'This calculator is a planning tool that models B2B marketing funnel dynamics using adjustable assumptions. Default values are based on typical mid-market B2B SaaS patterns and do not constitute financial advice, revenue projections, or guaranteed outcomes. Actual results vary significantly by industry, deal size, sales cycle, team capabilities, and market conditions.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, CONTENT_W);
  doc.text(disclaimerLines, MARGIN, y);
  y += disclaimerLines.length * 4.5 + 6;

  const sustainedDisclaimer = 'This model assumes sustained marketing investment with functional supporting content in-market. If the information ecosystem is incomplete, conversion rates and velocity will be materially lower than modeled. Campaign-spike models with periods of zero activity will produce worse outcomes than the sustained-pressure model shown here.';
  const sustainedLines = doc.splitTextToSize(sustainedDisclaimer, CONTENT_W);
  doc.text(sustainedLines, MARGIN, y);
  y += sustainedLines.length * 4.5 + 12;

  doc.setFontSize(10);
  doc.setTextColor(17, 17, 17);
  doc.text('Revenue Return Benchmarks for Growth-Stage B2B SaaS', MARGIN, y);
  y += 10;
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);

  const benchmarks = [
    ['First-year ARR per $1 S&M spend', '1x\u20132x common. Best-in-class: 2x+. Below 1x indicates issues.'],
    ['Marketing-sourced pipeline multiple', '3\u20135x pipeline per marketing dollar. 30\u201360% of new ARR.'],
    ['Marketing spend as % of revenue', '10\u201325% typical. VC-backed: 47% of S&M. PE-backed: 33%.'],
    ['Proportional scaling', 'If spend +20%, revenue should grow at least proportionally.'],
  ];

  benchmarks.forEach(([label, desc]) => {
    doc.setTextColor(17, 17, 17);
    doc.text(label, MARGIN, y);
    y += 4;
    doc.setTextColor(107, 107, 107);
    const descLines = doc.splitTextToSize(desc, CONTENT_W);
    doc.text(descLines, MARGIN, y);
    y += descLines.length * 3.5 + 5;
  });

  y += 10;
  doc.setFontSize(8);
  doc.setTextColor(107, 107, 107);
  doc.text('ASP-linked scaling based on: Optifai (N=847, 2025), Winning by Design (2023),', MARGIN, y);
  doc.text('Ebsta/Pavilion (4.2M opportunities, 2024), HubSpot (2024 Sales Trends).', MARGIN, y + 5);

  y += 18;
  doc.setFontSize(9);
  doc.setTextColor(17, 17, 17);
  doc.text('Built by Nick Talbert / Strategnik', MARGIN, y);
  doc.text('strategnik.com', MARGIN, y + 8);
}

export function addTimelineDataPage(doc: jsPDF, summary: SummaryMetrics, quarterly: import('../engine/types').QuarterlyOutput[]): void {
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text('Timeline to Revenue', MARGIN, 30);

  if (summary.firstRevenueQuarter !== null && summary.firstRevenueQuarter > 0) {
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14);
    const invAnnotation = `Investment period (Q1\u2013${summary.firstRevenueQuarterLabel}): Triggers are firing and prospects are traversing the information bridge. First closed revenue at ${summary.firstRevenueQuarterLabel}.`;
    const invLines = doc.splitTextToSize(invAnnotation, CONTENT_W);
    doc.text(invLines, MARGIN, 40);
  }

  doc.setFontSize(7);
  const tableStartY = summary.firstRevenueQuarter !== null && summary.firstRevenueQuarter > 0 ? 54 : 45;
  const headers = ['Quarter', 'Leads', 'MQLs', 'Opps', 'Won', 'Revenue', 'Total Cost'];
  const colW = 25;
  headers.forEach((h, i) => {
    doc.setTextColor(107, 107, 107);
    doc.text(h, MARGIN + i * colW, tableStartY);
  });

  quarterly.forEach((q, i) => {
    const tableY = tableStartY + 7 + i * 8;
    if (tableY > 270) return;
    doc.setTextColor(17, 17, 17);
    const vals = [
      q.quarterLabel,
      q.leads.toFixed(0),
      q.mqls.toFixed(0),
      q.opportunities.toFixed(0),
      q.closedWon.toFixed(1),
      `$${Math.round(q.revenue).toLocaleString()}`,
      `$${Math.round(q.totalCost).toLocaleString()}`,
    ];
    vals.forEach((v, j) => doc.text(v, MARGIN + j * colW, tableY));
  });
}

export function addBudgetUnitEconPage(doc: jsPDF, summary: SummaryMetrics): void {
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text('Budget & Unit Economics', MARGIN, 30);

  doc.setFontSize(8);
  doc.setTextColor(107, 107, 107);
  doc.text('Sustained pressure keeping triggers firing across all active accounts.', MARGIN, 39);

  let y = 50;
  const { unitEconomics } = summary;

  doc.setFontSize(10);
  doc.setTextColor(17, 17, 17);
  doc.text('Investment Summary', MARGIN, y);
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const budgetSummaryItems = [
    `Total Investment: $${Math.round(summary.totalInvestment).toLocaleString()}`,
    `Total Revenue: $${Math.round(summary.totalRevenue).toLocaleString()}`,
    `Effective CAC: $${Math.round(summary.effectiveCAC).toLocaleString()}`,
    `Freq:CPL Ratio: ${summary.frequencyToCPLRatio.toFixed(1)}x`,
    `ROI: ${(summary.roi * 100).toFixed(0)}%`,
  ];
  budgetSummaryItems.forEach(line => {
    doc.text(line, MARGIN, y);
    y += 6;
  });

  y += 8;
  doc.setFontSize(12);
  doc.setTextColor(17, 17, 17);
  doc.text('Unit Economics', MARGIN, y);
  doc.setFontSize(8);
  doc.setTextColor(107, 107, 107);
  doc.text('Can we afford to buy this revenue?', MARGIN, y + 6);
  y += 16;

  const econMetrics = [
    { label: 'LTV:CAC Ratio', value: `${unitEconomics.ltvCacRatio.toFixed(1)}:1`, status: getUnitEconLabel('ltvCac', unitEconomics.ltvCacRatio), desc: `LTV = $${Math.round(unitEconomics.ltv).toLocaleString()} | CAC = $${Math.round(unitEconomics.cac).toLocaleString()} | Target: 3:1 minimum` },
    { label: 'CAC Payback', value: `${Math.round(unitEconomics.cacPaybackMonths)} months`, status: getUnitEconLabel('cacPayback', unitEconomics.cacPaybackMonths), desc: 'Months to recover acquisition cost from gross profit. Target: <18 months.' },
    { label: 'New CAC Ratio', value: `$${unitEconomics.newCacRatio.toFixed(2)} per $1 ARR`, status: getUnitEconLabel('newCacRatio', unitEconomics.newCacRatio), desc: 'Total S&M spend per $1 new ARR. Industry median: $2.00. Target: <$1.50.' },
  ];

  econMetrics.forEach(m => {
    doc.setFontSize(10);
    doc.setTextColor(17, 17, 17);
    doc.text(`${m.label}: ${m.value}`, MARGIN, y);
    doc.setFontSize(8);
    doc.setTextColor(107, 107, 107);
    doc.text(`[${m.status}] ${m.desc}`, MARGIN, y + 6);
    y += 18;
  });

  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(107, 107, 107);
  doc.text(`Assumptions: ${(unitEconomics.grossMargin * 100).toFixed(0)}% gross margin, ${(unitEconomics.annualChurnRate * 100).toFixed(0)}% annual churn`, MARGIN, y);

  if (summary.trapWarnings.length > 0) {
    y += 14;
    doc.setFontSize(10);
    doc.setTextColor(146, 64, 14);
    doc.text('Model Warnings', MARGIN, y);
    y += 8;
    doc.setFontSize(8);
    summary.trapWarnings.forEach(trap => {
      const warnLines = doc.splitTextToSize(`\u26A0 ${trap.message}`, CONTENT_W);
      doc.text(warnLines, MARGIN, y);
      y += warnLines.length * 4.5 + 4;
    });
  }
}

