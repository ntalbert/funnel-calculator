import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { useCalculator } from '../state/context';
import { captureAllCharts } from './chartCapture';
import { analyzeTimeline, analyzeBudget, analyzeCohorts, analyzeData } from './recommendations';
import {
  addCoverPage,
  addExecutiveSummaryPage,
  addHowB2BWorksPage,
  addYourInputsPage,
  addCohortDetailPages,
  addAssumptionsPage,
  addTimelineDataPage,
  addBudgetUnitEconPage,
} from './pdfPages';
import {
  addTimelineChartPage,
  addTimelineAnalysisPage,
  addBudgetChartPage,
  addBudgetAnalysisPage,
  addCohortsChartPage,
  addCohortsAnalysisPage,
  addDataSummaryPage,
  addDataAnalysisPage,
} from './pdfChartPages';

export function EmailCaptureModal() {
  const { state, dispatch } = useCalculator();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');

  const generateAndDownloadPDF = async () => {
    setStatusText('Preparing charts...');

    // Wait for ChartCaptureContainer to render
    await new Promise(resolve => setTimeout(resolve, 400));

    // Capture charts
    const captures = await captureAllCharts();
    setStatusText('Analyzing data...');

    // Run analysis
    const timelineAnalysis = analyzeTimeline(state.inputs, state.outputs);
    const budgetAnalysis = analyzeBudget(state.inputs, state.outputs);
    const cohortAnalysis = analyzeCohorts(state.inputs, state.outputs);
    const dataAnalysis = analyzeData(state.inputs, state.outputs);

    setStatusText('Building PDF...');

    // Build PDF
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    // Pages 1-4: Existing pages
    addCoverPage(doc, firstName, company);
    addExecutiveSummaryPage(doc, state.outputs.summary, state.outputs.summary.unitEconomics);
    addHowB2BWorksPage(doc);
    addYourInputsPage(doc, state.inputs);

    // Pages 5-6: Timeline spread (chart + analysis)
    addTimelineChartPage(doc, captures);
    addTimelineAnalysisPage(doc, timelineAnalysis);

    // Pages 7-8: Budget spread (chart + analysis)
    addBudgetChartPage(doc, captures);
    addBudgetAnalysisPage(doc, budgetAnalysis);

    // Pages 9-10: Cohorts spread (chart + analysis)
    addCohortsChartPage(doc, captures, state.outputs);
    addCohortsAnalysisPage(doc, cohortAnalysis);

    // Pages 11-12: Data spread (table + analysis)
    addDataSummaryPage(doc, state.outputs);
    addDataAnalysisPage(doc, dataAnalysis);

    // Remaining: original text pages
    addTimelineDataPage(doc, state.outputs.summary, state.outputs.quarterly);
    addBudgetUnitEconPage(doc, state.outputs.summary);
    addCohortDetailPages(doc, state.outputs.cohorts);
    addAssumptionsPage(doc, state.outputs.summary);

    doc.save('funnel-velocity-analysis.pdf');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!firstName.trim()) {
      setError('Please enter your first name.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit lead data (fire and forget)
      fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name: firstName,
          company,
          role,
          source: 'funnel_calculator',
          scenario_name: 'Scenario',
          cohort_count: state.inputs.cohorts.length,
          arr_goal: state.inputs.goals.arrGoal,
          asp: state.inputs.goals.averageSellingPrice,
          true_cpl: state.outputs.summary.trueCPL,
          campaign_profiles: state.inputs.cohorts.map(c => c.profileId),
          ltv_cac_ratio: state.outputs.summary.unitEconomics.ltvCacRatio,
          cac_payback_months: state.outputs.summary.unitEconomics.cacPaybackMonths,
          new_cac_ratio: state.outputs.summary.unitEconomics.newCacRatio,
        }),
      }).catch(() => {});

      await generateAndDownloadPDF();
      dispatch({ type: 'HIDE_EMAIL_CAPTURE' });
      try { localStorage.setItem('strategnik_calc_lead_captured', '1'); } catch {}
    } catch {
      // Still try to generate PDF on error
      try {
        await generateAndDownloadPDF();
      } catch {}
      dispatch({ type: 'HIDE_EMAIL_CAPTURE' });
    }
  };

  // Check if already captured this session
  let alreadyCaptured = false;
  try { alreadyCaptured = !!localStorage.getItem('strategnik_calc_lead_captured'); } catch {}

  if (alreadyCaptured) {
    if (state.ui.showEmailCapture) {
      generateAndDownloadPDF().then(() => dispatch({ type: 'HIDE_EMAIL_CAPTURE' }));
    }
    return null;
  }

  return (
    <Modal
      isOpen={state.ui.showEmailCapture}
      onClose={() => dispatch({ type: 'HIDE_EMAIL_CAPTURE' })}
      title="Get your branded report"
    >
      <p className="text-sm text-gray-400 mb-4">
        Enter your details below and we'll generate a presentation-ready PDF with charts and analysis.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Work Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-9 px-3 text-sm text-white bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1de2c4] placeholder-gray-500"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">First Name *</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="w-full h-9 px-3 text-sm text-white bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1de2c4] placeholder-gray-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Company</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full h-9 px-3 text-sm text-white bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1de2c4] placeholder-gray-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full h-9 px-3 text-sm text-white bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1de2c4]"
          >
            <option value="">Select your role</option>
            <option value="VP/CMO Marketing">VP/CMO Marketing</option>
            <option value="Marketing Ops/RevOps">Marketing Ops/RevOps</option>
            <option value="CEO/CFO">CEO/CFO</option>
            <option value="Consultant/Agency">Consultant/Agency</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-10 text-sm font-medium text-black bg-[#1de2c4] rounded-lg hover:bg-[#4ae8d0] transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (statusText || 'Generating...') : 'Generate Report'}
        </button>

        <p className="text-[10px] text-gray-500 text-center">
          By submitting, you agree to receive occasional emails about B2B marketing strategy from Strategnik. Unsubscribe anytime.{' '}
          <a href="/privacy" className="underline hover:text-gray-300">Privacy Policy</a>
        </p>
      </form>
    </Modal>
  );
}
