import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '../shared/Modal';
import { useCalculator } from '../state/context';
import { PDFInfographic, TOTAL_PAGES } from './PDFInfographic';
import { captureInfographicPages } from './infographicCapture';
import { analyzeTimeline, analyzeBudget, analyzeCohorts, analyzeData } from './recommendations';

function isAlreadyCaptured(): boolean {
  try { return !!localStorage.getItem('strategnik_calc_lead_captured'); } catch { return false; }
}

export function EmailCaptureModal() {
  const { state, dispatch } = useCalculator();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');
  const autoDownloadTriggered = useRef(false);

  // Compute analysis for infographic (only when modal is open)
  const timelineAnalysis = state.ui.showEmailCapture ? analyzeTimeline(state.inputs, state.outputs) : null;
  const budgetAnalysis = state.ui.showEmailCapture ? analyzeBudget(state.inputs, state.outputs) : null;
  const cohortAnalysis = state.ui.showEmailCapture ? analyzeCohorts(state.inputs, state.outputs) : null;
  const dataAnalysis = state.ui.showEmailCapture ? analyzeData(state.inputs, state.outputs) : null;

  const generateAndDownloadPDF = useCallback(async () => {
    setStatusText('Rendering infographic...');

    // Wait for PDFInfographic + Recharts charts to render off-screen
    await new Promise(resolve => setTimeout(resolve, 800));

    setStatusText('Capturing pages...');
    const pages = await captureInfographicPages(TOTAL_PAGES);

    setStatusText('Building PDF...');
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) doc.addPage();
      doc.addImage(pages[i], 'JPEG', 0, 0, 210, 297);
    }

    doc.save('funnel-velocity-analysis.pdf');
  }, []);

  // Auto-download for returning users (already captured lead)
  useEffect(() => {
    if (!state.ui.showEmailCapture || !isAlreadyCaptured() || autoDownloadTriggered.current) return;
    autoDownloadTriggered.current = true;
    generateAndDownloadPDF().then(() => dispatch({ type: 'HIDE_EMAIL_CAPTURE' }));
  }, [state.ui.showEmailCapture, generateAndDownloadPDF, dispatch]);

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
          solver_locked: Object.values(state.solver.locks).filter(Boolean).length,
          solver_feasibility: state.solver.result.feasibility,
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

  // Skip form for returning users
  if (isAlreadyCaptured()) {
    return state.ui.showEmailCapture && timelineAnalysis && budgetAnalysis && cohortAnalysis && dataAnalysis ? (
      <PDFInfographic
        inputs={state.inputs}
        outputs={state.outputs}
        timeline={timelineAnalysis}
        budget={budgetAnalysis}
        cohorts={cohortAnalysis}
        data={dataAnalysis}
        firstName={firstName}
        company={company}
      />
    ) : null;
  }

  return (
    <>
      {/* Render infographic pages off-screen for capture */}
      {state.ui.showEmailCapture && timelineAnalysis && budgetAnalysis && cohortAnalysis && dataAnalysis && (
        <PDFInfographic
          inputs={state.inputs}
          outputs={state.outputs}
          timeline={timelineAnalysis}
          budget={budgetAnalysis}
          cohorts={cohortAnalysis}
          data={dataAnalysis}
          firstName={firstName}
          company={company}
        />
      )}

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
    </>
  );
}
