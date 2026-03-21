import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar, ComposedChart, Line, ReferenceArea,
} from 'recharts';
import type { CalculatorInputs, CalculatorOutputs, TrafficLightStatus } from '../engine/types';
import type { TimelineAnalysis, BudgetAnalysis, CohortAnalysis, DataAnalysis } from './recommendations';
import { CAMPAIGN_PROFILES, UNIT_ECONOMICS_THRESHOLDS } from '../engine/defaults';
import { formatNum as fmt, formatCurrency as fmtCur, formatPercentWhole as fmtPct } from '../shared/formatters';

// --- Constants ---

const PAGE_W = 800;
const PAGE_H = 1131;
const PAD = 40;
const CONTENT_W = PAGE_W - PAD * 2;

const C = {
  bg: '#0F172A',
  cardBg: '#1E293B',
  cardBorder: '#334155',
  accent: '#1DE2C4',
  accentDim: 'rgba(29, 226, 196, 0.15)',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textBody: '#CBD5E1',
  leads: '#3B82F6',
  mqls: '#10B981',
  opps: '#F59E0B',
  closedWon: '#8B5CF6',
  revenue: '#EC4899',
  frequency: '#3B82F6',
  cpl: '#06B6D4',
  software: '#8B5CF6',
  agency: '#F59E0B',
  cumCost: '#EF4444',
  cumRevenue: '#10B981',
};

// Profile-based colors are now used via CAMPAIGN_PROFILES[profileId].chartColor
const DARK_AXIS = { fontSize: 10, fill: '#94A3B8' };
const DARK_GRID = '#334155';
const DARK_LEGEND = { fontSize: 10, color: '#94A3B8' };


function trafficColor(status: TrafficLightStatus) {
  if (status === 'green') return { bg: 'rgba(34,197,94,0.15)', border: '#22C55E', text: '#4ADE80' };
  if (status === 'amber') return { bg: 'rgba(234,179,8,0.15)', border: '#EAB308', text: '#FACC15' };
  return { bg: 'rgba(239,68,68,0.15)', border: '#EF4444', text: '#F87171' };
}

function unitEconStatus(metric: string, value: number): TrafficLightStatus {
  const t = UNIT_ECONOMICS_THRESHOLDS;
  if (metric === 'ltv') return value >= t.ltvCac.green ? 'green' : value >= t.ltvCac.amber ? 'amber' : 'red';
  if (metric === 'payback') return value <= t.cacPaybackMonths.green ? 'green' : value <= t.cacPaybackMonths.amber ? 'amber' : 'red';
  return value <= t.newCacRatio.green ? 'green' : value <= t.newCacRatio.amber ? 'amber' : 'red';
}

// --- Shared layout elements ---

const pageStyle: React.CSSProperties = {
  width: PAGE_W, height: PAGE_H, backgroundColor: C.bg,
  padding: PAD, boxSizing: 'border-box', position: 'relative',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  overflow: 'hidden',
};

function PageHeader({ title, pageNum, totalPages }: { title: string; pageNum: number; totalPages: number }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <img src="/strategnik-logo.png" crossOrigin="anonymous" style={{ width: 100, opacity: 0.9 }} />
        <div style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, letterSpacing: '0.05em' }}>{title}</div>
      </div>
      <div style={{ height: 2, background: `linear-gradient(to right, ${C.accent}, transparent)`, marginBottom: 20 }} />
      <div style={{ position: 'absolute', bottom: 20, right: PAD, fontSize: 9, color: C.textMuted }}>
        Page {pageNum} of {totalPages}
      </div>
    </>
  );
}

function MetricCard({ value, label, wide }: { value: string; label: string; wide?: boolean }) {
  return (
    <div style={{
      flex: wide ? '1 1 48%' : '1 1 30%', backgroundColor: C.cardBg, borderRadius: 8,
      padding: '16px 20px', borderLeft: `3px solid ${C.accent}`,
    }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: C.textSecondary }}>{label}</div>
    </div>
  );
}

function InsightBox({ text }: { text: string }) {
  return (
    <div style={{
      backgroundColor: C.accentDim, border: `1px solid ${C.accent}33`,
      borderRadius: 8, padding: '12px 16px', marginTop: 12,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.accent, marginBottom: 4, letterSpacing: '0.05em' }}>KEY INSIGHT</div>
      <div style={{ fontSize: 11, color: C.textBody, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function TrafficLightCard({ value, label, status }: { value: string; label: string; status: TrafficLightStatus }) {
  const tc = trafficColor(status);
  return (
    <div style={{
      flex: '1 1 30%', backgroundColor: tc.bg, border: `1px solid ${tc.border}`,
      borderRadius: 8, padding: '14px 16px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: tc.text }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 500, color: C.textSecondary, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, letterSpacing: '0.08em', marginBottom: 10, marginTop: 16 }}>
      {text}
    </div>
  );
}

// --- Props ---

export interface PDFInfographicProps {
  inputs: CalculatorInputs;
  outputs: CalculatorOutputs;
  timeline: TimelineAnalysis;
  budget: BudgetAnalysis;
  cohorts: CohortAnalysis;
  data: DataAnalysis;
  firstName: string;
  company: string;
}

export const TOTAL_PAGES = 7;

export function PDFInfographic({ inputs, outputs, timeline, budget, cohorts, data, firstName, company }: PDFInfographicProps) {
  const { quarterly, cohorts: cohortOutputs, summary } = outputs;
  const arrGoal = inputs.goals.arrGoal;
  const ue = summary.unitEconomics;

  // --- Chart data ---
  const timelineData = quarterly.map(q => ({
    name: q.quarterLabel,
    Leads: parseFloat(q.leads.toFixed(1)),
    MQLs: parseFloat(q.mqls.toFixed(1)),
    Opportunities: parseFloat(q.opportunities.toFixed(1)),
    'Closed Won': parseFloat(q.closedWon.toFixed(2)),
    'Cum. Revenue': q.cumulativeRevenue,
  }));

  const budgetData = quarterly.map(q => ({
    name: q.quarterLabel,
    'Frequency Targeting': Math.round(q.frequencyCost),
    'CPL Lead Gen': Math.round(q.cplCost),
    Software: Math.round(q.softwareCost),
    Agency: Math.round(q.agencyCost),
  }));

  const crossoverData = quarterly.map(q => ({
    name: q.quarterLabel,
    'Cumulative Cost': q.cumulativeCost,
    'Cumulative Revenue': q.cumulativeRevenue,
  }));

  const contributionData = quarterly.map((q, qi) => {
    const row: Record<string, string | number> = { name: q.quarterLabel };
    for (const co of cohortOutputs) {
      row[co.cohortName] = parseFloat((co.quarterlyData[qi]?.closedWon || 0).toFixed(2));
    }
    return row;
  });

  const firstRevIdx = summary.firstRevenueQuarter;
  const investStart = quarterly.length > 0 ? quarterly[0].quarterLabel : null;
  const investEnd = firstRevIdx !== null && firstRevIdx < quarterly.length ? quarterly[firstRevIdx].quarterLabel : null;

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>

      {/* ===== PAGE 1: COVER ===== */}
      <div id="pdf-infographic-page-1" style={{ ...pageStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/strategnik-logo.png" crossOrigin="anonymous" style={{ width: 200, marginBottom: 32 }} />
        <div style={{ width: 120, height: 2, backgroundColor: C.accent, marginBottom: 32 }} />
        <div style={{ fontSize: 32, fontWeight: 700, color: 'white', letterSpacing: '0.08em', textAlign: 'center', marginBottom: 12 }}>
          FUNNEL VELOCITY
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'white', letterSpacing: '0.08em', textAlign: 'center', marginBottom: 16 }}>
          ANALYSIS
        </div>
        <div style={{ fontSize: 15, color: C.textSecondary, textAlign: 'center', lineHeight: 1.6 }}>
          B2B Marketing Investment & Pipeline Model
        </div>
        <div style={{ marginTop: 80, textAlign: 'center' }}>
          {firstName && <div style={{ fontSize: 14, color: C.textBody }}>Prepared for <span style={{ color: 'white', fontWeight: 600 }}>{firstName}</span></div>}
          {company && <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>{company}</div>}
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>{today}</div>
        </div>
        <div style={{ position: 'absolute', bottom: 24, right: PAD, fontSize: 10, color: C.textMuted }}>strategnik.com</div>
      </div>

      {/* ===== PAGE 2: EXECUTIVE SUMMARY ===== */}
      <div id="pdf-infographic-page-2" style={pageStyle}>
        <PageHeader title="EXECUTIVE SUMMARY" pageNum={2} totalPages={TOTAL_PAGES} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <MetricCard value={fmtCur(inputs.goals.arrGoal)} label="ARR Goal" />
          <MetricCard value={fmtCur(summary.totalRevenue)} label="Projected Revenue" />
          <MetricCard value={fmtCur(summary.totalInvestment)} label="Total Investment" />
          <MetricCard value={summary.firstRevenueQuarterLabel} label="First Revenue" />
          <MetricCard value={`${(summary.roi * 100).toFixed(0)}%`} label="ROI" />
          <MetricCard value={summary.crossoverQuarterLabel} label="Crossover Quarter" />
        </div>

        <SectionLabel text="UNIT ECONOMICS" />
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <TrafficLightCard value={`${ue.ltvCacRatio.toFixed(1)}:1`} label="LTV:CAC Ratio" status={unitEconStatus('ltv', ue.ltvCacRatio)} />
          <TrafficLightCard value={`${Math.round(ue.cacPaybackMonths)} mo`} label="CAC Payback" status={unitEconStatus('payback', ue.cacPaybackMonths)} />
          <TrafficLightCard value={`$${ue.newCacRatio.toFixed(2)}`} label="New CAC Ratio" status={unitEconStatus('ratio', ue.newCacRatio)} />
        </div>

        <SectionLabel text="KEY METRICS" />
        <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
          <MetricCard value={fmtCur(summary.trueCPL)} label="True CPL (Fully Loaded)" wide />
          <MetricCard value={fmtCur(summary.effectiveCAC)} label="Effective CAC" wide />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <MetricCard value={`${summary.currentSalesVelocity.toFixed(0)} days`} label="Current Sales Velocity" wide />
          <MetricCard value={`${summary.daysSavedVsBaseline.toFixed(0)} days`} label="Days Saved vs Baseline" wide />
        </div>

        <InsightBox text={timeline.keyInsight} />

        <SectionLabel text="PROGRAM CONFIGURATION" />
        <div style={{ fontSize: 10, color: C.textBody, lineHeight: 1.7 }}>
          {inputs.cohorts.length} cohort{inputs.cohorts.length > 1 ? 's' : ''} | {inputs.simulationQuarters} quarter horizon | ASP: {fmtCur(inputs.goals.averageSellingPrice)} | {inputs.cohorts.map(c => `${CAMPAIGN_PROFILES[c.profileId].label}: ${c.totalAccounts.toLocaleString()} accts`).join(' | ')}
        </div>
      </div>

      {/* ===== PAGE 3: TIMELINE ===== */}
      <div id="pdf-infographic-page-3" style={pageStyle}>
        <PageHeader title="TIMELINE" pageNum={3} totalPages={TOTAL_PAGES} />

        <SectionLabel text="FUNNEL VOLUME BY QUARTER" />
        <div style={{ backgroundColor: C.cardBg, borderRadius: 8, padding: 12 }}>
          <AreaChart width={CONTENT_W - 24} height={300} data={timelineData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={DARK_GRID} />
            <XAxis dataKey="name" tick={DARK_AXIS} />
            <YAxis tick={DARK_AXIS} tickFormatter={fmt} />
            <Legend wrapperStyle={DARK_LEGEND} />
            {investStart && investEnd && firstRevIdx !== null && firstRevIdx > 0 && (
              <ReferenceArea x1={investStart} x2={investEnd} fill="#fef3c7" fillOpacity={0.1}
                label={{ value: 'Investment Period', position: 'insideTop', fontSize: 9, fill: '#FACC15' }} />
            )}
            <Area type="monotone" dataKey="Leads" stackId="1" fill={C.leads} stroke={C.leads} fillOpacity={0.6} isAnimationActive={false} />
            <Area type="monotone" dataKey="MQLs" stackId="1" fill={C.mqls} stroke={C.mqls} fillOpacity={0.6} isAnimationActive={false} />
            <Area type="monotone" dataKey="Opportunities" stackId="1" fill={C.opps} stroke={C.opps} fillOpacity={0.6} isAnimationActive={false} />
            <Area type="monotone" dataKey="Closed Won" stackId="1" fill={C.closedWon} stroke={C.closedWon} fillOpacity={0.6} isAnimationActive={false} />
          </AreaChart>
        </div>

        <SectionLabel text="CONVERSION RATES" />
        <div style={{ display: 'flex', gap: 8 }}>
          {timeline.stages.map(s => {
            const healthColor = s.health === 'strong' ? '#4ADE80' : s.health === 'typical' ? '#FACC15' : '#F87171';
            return (
              <div key={s.stage} style={{
                flex: 1, backgroundColor: C.cardBg, borderRadius: 8, padding: '10px 12px',
                borderTop: `3px solid ${healthColor}`, textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary }}>{fmtPct(s.userRate)}</div>
                <div style={{ fontSize: 9, color: C.textSecondary, marginTop: 2 }}>{s.stage}</div>
              </div>
            );
          })}
        </div>

        <SectionLabel text="CUMULATIVE REVENUE VS. GOAL" />
        <div style={{ backgroundColor: C.cardBg, borderRadius: 8, padding: 12 }}>
          <ComposedChart width={CONTENT_W - 24} height={220} data={timelineData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={DARK_GRID} />
            <XAxis dataKey="name" tick={DARK_AXIS} />
            <YAxis tick={DARK_AXIS} tickFormatter={fmtCur} />
            <Legend wrapperStyle={DARK_LEGEND} />
            <Area type="monotone" dataKey="Cum. Revenue" fill={C.revenue} stroke={C.revenue} fillOpacity={0.2} isAnimationActive={false} />
            <Line type="monotone" dataKey={() => arrGoal} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={1.5} dot={false} name="ARR Goal" isAnimationActive={false} />
          </ComposedChart>
        </div>

        <InsightBox text={`Investment period: ${timeline.investmentPeriodQuarters} quarters. Sales velocity: ${timeline.velocityDays} days (${timeline.velocityImprovement} days saved).`} />
      </div>

      {/* ===== PAGE 4: BUDGET ===== */}
      <div id="pdf-infographic-page-4" style={pageStyle}>
        <PageHeader title="BUDGET" pageNum={4} totalPages={TOTAL_PAGES} />

        <SectionLabel text="QUARTERLY BUDGET BREAKDOWN" />
        <div style={{ backgroundColor: C.cardBg, borderRadius: 8, padding: 12 }}>
          <BarChart width={CONTENT_W - 24} height={300} data={budgetData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={DARK_GRID} />
            <XAxis dataKey="name" tick={DARK_AXIS} />
            <YAxis tick={DARK_AXIS} tickFormatter={fmtCur} />
            <Legend wrapperStyle={DARK_LEGEND} />
            <Bar dataKey="Frequency Targeting" stackId="a" fill={C.frequency} isAnimationActive={false} />
            <Bar dataKey="CPL Lead Gen" stackId="a" fill={C.cpl} isAnimationActive={false} />
            <Bar dataKey="Software" stackId="a" fill={C.software} isAnimationActive={false} />
            <Bar dataKey="Agency" stackId="a" fill={C.agency} isAnimationActive={false} />
          </BarChart>
        </div>

        <SectionLabel text="CUMULATIVE INVESTMENT VS. REVENUE" />
        <div style={{ backgroundColor: C.cardBg, borderRadius: 8, padding: 12 }}>
          <ComposedChart width={CONTENT_W - 24} height={200} data={crossoverData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={DARK_GRID} />
            <XAxis dataKey="name" tick={DARK_AXIS} />
            <YAxis tick={DARK_AXIS} tickFormatter={fmtCur} />
            <Legend wrapperStyle={DARK_LEGEND} />
            <Line type="monotone" dataKey="Cumulative Cost" stroke={C.cumCost} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="Cumulative Revenue" stroke={C.cumRevenue} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </div>

        <SectionLabel text="BUDGET ALLOCATION" />
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {(['frequency', 'cpl', 'software', 'agency'] as const).map(key => {
            const alloc = budget.allocation[key];
            const colors: Record<string, string> = { frequency: C.frequency, cpl: C.cpl, software: C.software, agency: C.agency };
            const labels: Record<string, string> = { frequency: 'Frequency', cpl: 'CPL', software: 'Software', agency: 'Agency' };
            return (
              <div key={key} style={{ flex: 1, backgroundColor: C.cardBg, borderRadius: 8, padding: '10px 12px', textAlign: 'center', borderTop: `3px solid ${colors[key]}` }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary }}>{fmtPct(alloc.percent)}</div>
                <div style={{ fontSize: 9, color: C.textSecondary }}>{labels[key]}</div>
                <div style={{ fontSize: 9, color: C.textMuted }}>{fmtCur(alloc.amount)}</div>
              </div>
            );
          })}
        </div>

        <InsightBox text={budget.keyInsight} />
      </div>

      {/* ===== PAGE 5: COHORTS ===== */}
      <div id="pdf-infographic-page-5" style={pageStyle}>
        <PageHeader title="COHORTS" pageNum={5} totalPages={TOTAL_PAGES} />

        {cohortOutputs.length > 1 && (
          <>
            <SectionLabel text="CLOSED-WON CONTRIBUTION BY COHORT" />
            <div style={{ backgroundColor: C.cardBg, borderRadius: 8, padding: 12 }}>
              <BarChart width={CONTENT_W - 24} height={250} data={contributionData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={DARK_GRID} />
                <XAxis dataKey="name" tick={DARK_AXIS} />
                <YAxis tick={DARK_AXIS} tickFormatter={fmt} />
                <Legend wrapperStyle={DARK_LEGEND} />
                {cohortOutputs.map((co) => (
                  <Bar key={co.cohortId} dataKey={co.cohortName} stackId="a" fill={CAMPAIGN_PROFILES[co.profileId].chartColor} isAnimationActive={false} />
                ))}
              </BarChart>
            </div>
          </>
        )}

        <SectionLabel text="COHORT PERFORMANCE" />
        {cohorts.cohortBreakdown.map((cb, i) => {
          const cohortInput = inputs.cohorts[i];
          const profile = cohortInput ? CAMPAIGN_PROFILES[cohortInput.profileId] : null;
          const chartColor = profile?.chartColor ?? C.accent;
          const isOpportunityEntry = profile?.funnelEntry === 'opportunity';
          const isWarm = profile?.category === 'warm';
          const badgeBg = isWarm ? 'rgba(245, 158, 11, 0.15)' : C.accentDim;
          const badgeColor = isWarm ? '#F59E0B' : C.accent;
          return (
            <div key={cb.name} style={{
              backgroundColor: C.cardBg, borderRadius: 8, padding: '14px 16px', marginBottom: 10,
              borderLeft: `3px solid ${chartColor}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{cb.name}</div>
                <div style={{ fontSize: 10, color: badgeColor, backgroundColor: badgeBg, padding: '2px 8px', borderRadius: 4 }}>{cb.profile}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: C.textBody }}>
                <span style={{ fontWeight: 600, color: C.textPrimary }}>{cb.accounts.toLocaleString()}</span> {isOpportunityEntry ? 'opps' : 'accts'}
                <span style={{ color: C.textMuted }}>→</span>
                <span style={{ fontWeight: 600, color: C.textPrimary }}>{cb.deals.toFixed(1)}</span> deals
                <span style={{ color: C.textMuted }}>→</span>
                <span style={{ fontWeight: 600, color: C.accent }}>{fmtCur(cb.revenue)}</span> revenue
                <span style={{ color: C.textMuted, marginLeft: 'auto' }}>{fmtCur(cb.costPerDeal)}/deal</span>
              </div>
            </div>
          );
        })}

        <InsightBox text={cohorts.keyInsight} />

        {cohorts.recommendations.length > 0 && (
          <>
            <SectionLabel text="RECOMMENDATIONS" />
            {cohorts.recommendations.map((rec, i) => (
              <div key={i} style={{ fontSize: 10, color: C.textBody, lineHeight: 1.6, marginBottom: 4, paddingLeft: 12, borderLeft: `2px solid ${C.cardBorder}` }}>
                {rec}
              </div>
            ))}
          </>
        )}
      </div>

      {/* ===== PAGE 6: DATA ===== */}
      <div id="pdf-infographic-page-6" style={pageStyle}>
        <PageHeader title="QUARTERLY DATA" pageNum={6} totalPages={TOTAL_PAGES} />

        <SectionLabel text="FUNNEL METRICS" />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr>
              {['Quarter', 'Leads', 'MQLs', 'Opps', 'Won', 'Pipeline', 'Revenue'].map(h => (
                <th key={h} style={{ textAlign: h === 'Quarter' ? 'left' : 'right', padding: '8px 6px', color: C.accent, fontWeight: 600, fontSize: 9, borderBottom: `1px solid ${C.cardBorder}`, letterSpacing: '0.05em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quarterly.map((q, i) => (
              <tr key={q.quarter} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : C.cardBg }}>
                <td style={{ padding: '6px', color: C.textPrimary, fontWeight: 500, fontSize: 9 }}>{q.quarterLabel}</td>
                <td style={{ padding: '6px', color: C.textBody, textAlign: 'right', fontSize: 9 }}>{fmt(q.leads)}</td>
                <td style={{ padding: '6px', color: C.textBody, textAlign: 'right', fontSize: 9 }}>{fmt(q.mqls)}</td>
                <td style={{ padding: '6px', color: C.textBody, textAlign: 'right', fontSize: 9 }}>{fmt(q.opportunities)}</td>
                <td style={{ padding: '6px', color: C.textBody, textAlign: 'right', fontSize: 9 }}>{q.closedWon.toFixed(1)}</td>
                <td style={{ padding: '6px', color: C.textBody, textAlign: 'right', fontSize: 9 }}>{fmtCur(q.pipeline)}</td>
                <td style={{ padding: '6px', color: C.accent, textAlign: 'right', fontWeight: 600, fontSize: 9 }}>{fmtCur(q.revenue)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: `2px solid ${C.accent}` }}>
              <td style={{ padding: '8px 6px', color: C.textPrimary, fontWeight: 700, fontSize: 10 }}>TOTAL</td>
              <td style={{ padding: '8px 6px', color: C.textPrimary, textAlign: 'right', fontWeight: 700, fontSize: 10 }}>{fmt(summary.totalLeads)}</td>
              <td style={{ padding: '8px 6px', color: C.textPrimary, textAlign: 'right', fontWeight: 700, fontSize: 10 }}>{fmt(quarterly.reduce((s, q) => s + q.mqls, 0))}</td>
              <td style={{ padding: '8px 6px', color: C.textPrimary, textAlign: 'right', fontWeight: 700, fontSize: 10 }}>{fmt(quarterly.reduce((s, q) => s + q.opportunities, 0))}</td>
              <td style={{ padding: '8px 6px', color: C.textPrimary, textAlign: 'right', fontWeight: 700, fontSize: 10 }}>{summary.totalClosedWon.toFixed(1)}</td>
              <td style={{ padding: '8px 6px', color: C.textPrimary, textAlign: 'right', fontWeight: 700, fontSize: 10 }}>{fmtCur(summary.totalPipeline)}</td>
              <td style={{ padding: '8px 6px', color: C.accent, textAlign: 'right', fontWeight: 700, fontSize: 10 }}>{fmtCur(summary.totalRevenue)}</td>
            </tr>
          </tbody>
        </table>

        <SectionLabel text="FINANCIAL SUMMARY" />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr>
              {['Quarter', 'Freq Cost', 'CPL Cost', 'Agency', 'Software', 'Total Cost', 'Cum. Cost', 'Cum. Revenue'].map(h => (
                <th key={h} style={{ textAlign: h === 'Quarter' ? 'left' : 'right', padding: '8px 4px', color: C.accent, fontWeight: 600, fontSize: 8, borderBottom: `1px solid ${C.cardBorder}`, letterSpacing: '0.04em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quarterly.map((q, i) => (
              <tr key={q.quarter} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : C.cardBg }}>
                <td style={{ padding: '5px 4px', color: C.textPrimary, fontWeight: 500, fontSize: 8 }}>{q.quarterLabel}</td>
                <td style={{ padding: '5px 4px', color: C.textBody, textAlign: 'right', fontSize: 8 }}>{fmtCur(q.frequencyCost)}</td>
                <td style={{ padding: '5px 4px', color: C.textBody, textAlign: 'right', fontSize: 8 }}>{fmtCur(q.cplCost)}</td>
                <td style={{ padding: '5px 4px', color: C.textBody, textAlign: 'right', fontSize: 8 }}>{fmtCur(q.agencyCost)}</td>
                <td style={{ padding: '5px 4px', color: C.textBody, textAlign: 'right', fontSize: 8 }}>{fmtCur(q.softwareCost)}</td>
                <td style={{ padding: '5px 4px', color: C.textPrimary, textAlign: 'right', fontWeight: 600, fontSize: 8 }}>{fmtCur(q.totalCost)}</td>
                <td style={{ padding: '5px 4px', color: C.cumCost, textAlign: 'right', fontSize: 8 }}>{fmtCur(q.cumulativeCost)}</td>
                <td style={{ padding: '5px 4px', color: C.cumRevenue, textAlign: 'right', fontSize: 8 }}>{fmtCur(q.cumulativeRevenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <InsightBox text={data.keyInsight} />
      </div>

      {/* ===== PAGE 7: METHODOLOGY ===== */}
      <div id="pdf-infographic-page-7" style={pageStyle}>
        <PageHeader title="METHODOLOGY" pageNum={7} totalPages={TOTAL_PAGES} />

        <SectionLabel text="MODEL ASSUMPTIONS" />
        <div style={{ fontSize: 10, color: C.textBody, lineHeight: 1.8 }}>
          {[
            `Quarterly velocity distribution: leads are distributed across 4 quarters per cohort using campaign-profile-specific weights (not front-loaded into Q1).`,
            `ASP-linked conversion scaling: conversion rates and sales velocity are automatically adjusted based on average selling price ($${inputs.goals.averageSellingPrice.toLocaleString()}).`,
            `Cross-cohort compounding: multiple active cohorts boost Lead→MQL and MQL→Opp by 15% per additional active cohort, phased in over 2 quarters.`,
            `Frequency-conversion coupling: monthly frequency above the profile baseline improves Lead→MQL and MQL→Opp rates (up to +25% at 20 touches/month) and shifts leads earlier in the timeline.`,
            `Quarterly onboarding cap: ${inputs.advanced.quarterlyOnboardingCap.toLocaleString()} accounts/quarter. Excess accounts are queued for subsequent quarters.`,
            `Sales velocity improvement: ${fmtPct(inputs.advanced.maxVelocityImprovement)} maximum reduction over 4 quarters, reflecting better-qualified pipeline.`,
            `Quarterly dropout rate: ${fmtPct(inputs.advanced.quarterlyDropoutRate)} of in-progress accounts removed each quarter.`,
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: 6, paddingLeft: 14, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: C.accent }}>•</span>
              {item}
            </div>
          ))}
        </div>

        <SectionLabel text="DATA SOURCES" />
        <div style={{ fontSize: 10, color: C.textBody, lineHeight: 1.8 }}>
          {[
            'ITSMA/Momentum ABM Benchmark Study — account capacity and conversion benchmarks',
            'SaaS Capital Annual Survey — CAC ratios, LTV:CAC, payback benchmarks',
            'Forrester B2B Marketing Funnel Study — funnel stage conversion rates',
            'Demandbase / 6sense ABM Platform Data — frequency and engagement benchmarks',
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: 4, paddingLeft: 14, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: C.accent }}>•</span>
              {item}
            </div>
          ))}
        </div>

        <SectionLabel text="DISCLAIMER" />
        <div style={{ fontSize: 9, color: C.textMuted, lineHeight: 1.7 }}>
          This model uses industry benchmarks and user-provided inputs to generate forward-looking projections.
          Results are estimates based on assumptions about conversion rates, sales velocity, and budget allocation.
          Actual results will vary based on execution quality, market conditions, competitive dynamics, and team capacity.
          This report is not a guarantee of future performance.
        </div>

        <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center' }}>
          <img src="/strategnik-logo.png" crossOrigin="anonymous" style={{ width: 140, marginBottom: 12, opacity: 0.8 }} />
          <div style={{ fontSize: 11, color: C.textSecondary }}>strategnik.com</div>
          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>Funnel Velocity Calculator</div>
        </div>
      </div>

    </div>
  );
}
