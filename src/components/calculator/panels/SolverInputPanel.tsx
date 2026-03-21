import { motion } from 'motion/react';
import { useCalculator } from '../state/context';
import { LockableInput } from '../shared/LockableInput';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { CohortBuilder } from './CohortBuilder';
import { AdvancedSection } from './AdvancedSection';
import { LOCK_PRESETS, TOOLTIPS, CAMPAIGN_PROFILES } from '../engine/defaults';
import { formatCurrencyInput as formatCurrency, formatPercent, formatNumber } from '../shared/formatters';
import { SOLVER_BOUNDS } from '../engine/solver-bounds';
import type { SolverVariableId } from '../engine/solver-types';

export function SolverInputPanel() {
  const { state, dispatch } = useCalculator();
  const { solver } = state;
  const { values, locks, result, activePresetId } = solver;
  const boundedSet = new Set(result.boundedVariables);

  const isExpanded = (id: string) => state.ui.expandedSections.includes(id);
  const toggle = (id: string) => dispatch({ type: 'TOGGLE_SECTION', section: id });

  const handleValueChange = (variable: SolverVariableId, value: number) => {
    dispatch({ type: 'SET_SOLVER_VALUE', variable, value });
  };

  const handleToggleLock = (variable: SolverVariableId) => {
    dispatch({ type: 'TOGGLE_LOCK', variable });
  };

  const handlePreset = (presetId: string) => {
    dispatch({ type: 'SET_LOCK_PRESET', presetId });
  };

  // Multi-cohort detection and blended rates
  const cohortInputs = state.inputs.cohorts;
  const isMultiCohort = cohortInputs.length > 1;
  const totalAccounts = cohortInputs.reduce((s, c) => s + c.totalAccounts, 0);

  const blendedRates = (() => {
    if (!isMultiCohort || totalAccounts === 0) return [];
    // Weighted average of each rate by account count
    let wA2L = 0, wL2M = 0, wM2O = 0, wO2C = 0;
    for (const c of cohortInputs) {
      const p = CAMPAIGN_PROFILES[c.profileId];
      const r = c.conversionOverrides ?? {};
      const w = c.totalAccounts / totalAccounts;
      wA2L += (r.accountToLead ?? p.conversionRates.accountToLead) * w;
      wL2M += (r.leadToMQL ?? p.conversionRates.leadToMQL) * w;
      wM2O += (r.mqlToOpp ?? p.conversionRates.mqlToOpp) * w;
      wO2C += (r.oppToClose ?? p.conversionRates.oppToClose) * w;
    }
    return [
      { label: 'Account → Lead', value: wA2L },
      { label: 'Lead → MQL', value: wL2M },
      { label: 'MQL → Opportunity', value: wM2O },
      { label: 'Opp → Close', value: wO2C },
    ];
  })();

  // Cohort summary
  const cohortSummary = `${cohortInputs.length} cohort${cohortInputs.length > 1 ? 's' : ''}`;
  const advancedSummary = `${Math.round(state.inputs.advanced.quarterlyDropoutRate * 100)}% dropout · ${state.inputs.advanced.salesVelocityDays}d velocity`;

  return (
    <div className="w-80 flex-shrink-0 bg-gray-900 border-r border-gray-800 overflow-y-auto h-full">
      {/* Lock Presets */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-1.5">
          {LOCK_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => handlePreset(preset.id)}
              className={`flex-1 px-2 py-1.5 text-[10px] font-medium rounded-md transition-colors ${
                activePresetId === preset.id
                  ? 'bg-[#1de2c4]/20 text-[#1de2c4] border border-[#1de2c4]/30'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Squeeze / Tension Banner */}
      {result.squeezeAnalysis && (
        <motion.div
          className="mx-4 mt-3 p-3 rounded-lg bg-amber-900/20 border border-amber-700/30"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-amber-400 flex-shrink-0 mt-0.5">
              <path d="M12 9v4m0 4h.01M3.27 17l7.73-13.4a1.15 1.15 0 012 0L20.73 17a1.15 1.15 0 01-1 1.73H4.27a1.15 1.15 0 01-1-1.73z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <p className="text-[10px] font-medium text-amber-300">{result.squeezeAnalysis.message}</p>
              <p className="text-[10px] text-amber-400/70 mt-1">{result.squeezeAnalysis.suggestion}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Feasibility indicator */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            result.feasibility === 'solved' ? 'bg-emerald-400' : 'bg-amber-400'
          }`} />
          <span className="text-[10px] text-gray-500">
            {result.feasibility === 'solved'
              ? `${Object.values(locks).filter(Boolean).length} locked · ${Object.values(locks).filter(v => !v).length} derived`
              : 'Overconstrained — some values hit bounds'
            }
          </span>
        </div>
      </div>

      {/* Solver Variables */}
      <div className="px-4 py-2">
        {/* Revenue & Deal Size */}
        <div className="mb-3">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Revenue & Deal Size</div>
          <LockableInput
            label="Revenue Goal"
            value={values.revenueGoal}
            isLocked={locks.revenueGoal}
            isBounded={boundedSet.has('revenueGoal')}
            onToggleLock={() => handleToggleLock('revenueGoal')}
            onChange={(v) => handleValueChange('revenueGoal', v)}
            tooltip={TOOLTIPS.arrGoal}
            prefix="$"
            min={SOLVER_BOUNDS.revenueGoal.min}
            max={SOLVER_BOUNDS.revenueGoal.max}
            step={100000}
            format={formatCurrency}
          />
          <LockableInput
            label="Avg Selling Price"
            value={values.asp}
            isLocked={locks.asp}
            isBounded={boundedSet.has('asp')}
            onToggleLock={() => handleToggleLock('asp')}
            onChange={(v) => handleValueChange('asp', v)}
            tooltip={TOOLTIPS.averageSellingPrice}
            prefix="$"
            min={SOLVER_BOUNDS.asp.min}
            max={SOLVER_BOUNDS.asp.max}
            step={5000}
            format={formatCurrency}
          />
          <LockableInput
            label="Time Horizon"
            value={values.timeHorizonQuarters}
            isLocked={locks.timeHorizonQuarters}
            isBounded={boundedSet.has('timeHorizonQuarters')}
            onToggleLock={() => handleToggleLock('timeHorizonQuarters')}
            onChange={(v) => handleValueChange('timeHorizonQuarters', v)}
            suffix="qtrs"
            min={SOLVER_BOUNDS.timeHorizonQuarters.min}
            max={SOLVER_BOUNDS.timeHorizonQuarters.max}
            step={1}
            format={(n) => `${Math.round(n)} qtrs`}
          />
        </div>

        {/* Funnel Rates + Accounts — editable when single cohort, read-only blended when multi */}
        {isMultiCohort ? (
          <>
            <div className="mb-3">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Blended Funnel Rates</div>
              <div className="text-[9px] text-gray-600 mb-2">Weighted by accounts across {state.inputs.cohorts.length} cohorts. Edit per-cohort below.</div>
              {blendedRates.map(r => (
                <div key={r.label} className="flex items-center justify-between h-9 px-1">
                  <span className="text-xs text-gray-400">{r.label}</span>
                  <span className="text-xs font-medium text-gray-300">{formatPercent(r.value)}</span>
                </div>
              ))}
            </div>
            <div className="mb-3">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Accounts</div>
              <div className="flex items-center justify-between h-9 px-1">
                <span className="text-xs text-gray-400">Across all cohorts</span>
                <span className="text-xs font-medium text-gray-300">{formatNumber(totalAccounts)}</span>
              </div>
              <div className="text-[9px] text-gray-600 mt-0.5">
                {state.inputs.cohorts.map(c => {
                  const p = CAMPAIGN_PROFILES[c.profileId];
                  return `${c.name}: ${c.totalAccounts.toLocaleString()} (${p.label})`;
                }).join(' · ')}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mb-3">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Funnel Rates</div>
              <LockableInput
                label="Account → Lead"
                value={values.accountToLead}
                isLocked={locks.accountToLead}
                isBounded={boundedSet.has('accountToLead')}
                onToggleLock={() => handleToggleLock('accountToLead')}
                onChange={(v) => handleValueChange('accountToLead', v)}
                tooltip={TOOLTIPS.accountToLead}
                isPercent
                min={SOLVER_BOUNDS.accountToLead.min}
                max={SOLVER_BOUNDS.accountToLead.max}
                step={0.01}
                format={formatPercent}
              />
              <LockableInput
                label="Lead → MQL"
                value={values.leadToMQL}
                isLocked={locks.leadToMQL}
                isBounded={boundedSet.has('leadToMQL')}
                onToggleLock={() => handleToggleLock('leadToMQL')}
                onChange={(v) => handleValueChange('leadToMQL', v)}
                tooltip={TOOLTIPS.leadToMQL}
                isPercent
                min={SOLVER_BOUNDS.leadToMQL.min}
                max={SOLVER_BOUNDS.leadToMQL.max}
                step={0.01}
                format={formatPercent}
              />
              <LockableInput
                label="MQL → Opportunity"
                value={values.mqlToOpp}
                isLocked={locks.mqlToOpp}
                isBounded={boundedSet.has('mqlToOpp')}
                onToggleLock={() => handleToggleLock('mqlToOpp')}
                onChange={(v) => handleValueChange('mqlToOpp', v)}
                tooltip={TOOLTIPS.mqlToOpp}
                isPercent
                min={SOLVER_BOUNDS.mqlToOpp.min}
                max={SOLVER_BOUNDS.mqlToOpp.max}
                step={0.01}
                format={formatPercent}
              />
              <LockableInput
                label="Opp → Close"
                value={values.oppToClose}
                isLocked={locks.oppToClose}
                isBounded={boundedSet.has('oppToClose')}
                onToggleLock={() => handleToggleLock('oppToClose')}
                onChange={(v) => handleValueChange('oppToClose', v)}
                tooltip={TOOLTIPS.oppToClose}
                isPercent
                min={SOLVER_BOUNDS.oppToClose.min}
                max={SOLVER_BOUNDS.oppToClose.max}
                step={0.01}
                format={formatPercent}
              />
            </div>

            <div className="mb-3">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Accounts</div>
              <LockableInput
                label="Target Accounts"
                value={values.accounts}
                isLocked={locks.accounts}
                isBounded={boundedSet.has('accounts')}
                onToggleLock={() => handleToggleLock('accounts')}
                onChange={(v) => handleValueChange('accounts', v)}
                tooltip={TOOLTIPS.totalAccounts}
                min={SOLVER_BOUNDS.accounts.min}
                max={SOLVER_BOUNDS.accounts.max}
                step={25}
                format={formatNumber}
              />
            </div>
          </>
        )}

        {/* Cost Parameters */}
        <div className="mb-3">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Cost Parameters</div>
          <LockableInput
            label="Total Budget"
            value={values.totalBudget}
            isLocked={locks.totalBudget}
            isBounded={boundedSet.has('totalBudget')}
            onToggleLock={() => handleToggleLock('totalBudget')}
            onChange={(v) => handleValueChange('totalBudget', v)}
            prefix="$"
            min={SOLVER_BOUNDS.totalBudget.min}
            max={SOLVER_BOUNDS.totalBudget.max}
            step={10000}
            format={formatCurrency}
          />
          <LockableInput
            label="Blended CPL"
            value={values.blendedCPL}
            isLocked={locks.blendedCPL}
            isBounded={boundedSet.has('blendedCPL')}
            onToggleLock={() => handleToggleLock('blendedCPL')}
            onChange={(v) => handleValueChange('blendedCPL', v)}
            tooltip={TOOLTIPS.blendedCPL}
            prefix="$"
            min={SOLVER_BOUNDS.blendedCPL.min}
            max={SOLVER_BOUNDS.blendedCPL.max}
            step={25}
            format={formatCurrency}
          />
          <LockableInput
            label="Monthly Frequency"
            value={values.monthlyFrequency}
            isLocked={locks.monthlyFrequency}
            isBounded={boundedSet.has('monthlyFrequency')}
            onToggleLock={() => handleToggleLock('monthlyFrequency')}
            onChange={(v) => handleValueChange('monthlyFrequency', v)}
            tooltip={TOOLTIPS.monthlyFrequency}
            min={SOLVER_BOUNDS.monthlyFrequency.min}
            max={SOLVER_BOUNDS.monthlyFrequency.max}
            step={1}
            format={(n) => `${Math.round(n)}/mo`}
          />
          <LockableInput
            label="Cost per Touch"
            value={values.costPerTouch}
            isLocked={locks.costPerTouch}
            isBounded={boundedSet.has('costPerTouch')}
            onToggleLock={() => handleToggleLock('costPerTouch')}
            onChange={(v) => handleValueChange('costPerTouch', v)}
            tooltip={TOOLTIPS.costPerTouch}
            prefix="$"
            min={SOLVER_BOUNDS.costPerTouch.min}
            max={SOLVER_BOUNDS.costPerTouch.max}
            step={0.25}
            format={(n) => `$${n.toFixed(2)}`}
          />
          <LockableInput
            label="Software / Quarter"
            value={values.softwareCostPerQuarter}
            isLocked={locks.softwareCostPerQuarter}
            isBounded={boundedSet.has('softwareCostPerQuarter')}
            onToggleLock={() => handleToggleLock('softwareCostPerQuarter')}
            onChange={(v) => handleValueChange('softwareCostPerQuarter', v)}
            tooltip={TOOLTIPS.softwareBudget}
            prefix="$"
            min={SOLVER_BOUNDS.softwareCostPerQuarter.min}
            max={SOLVER_BOUNDS.softwareCostPerQuarter.max}
            step={1000}
            format={formatCurrency}
          />
        </div>
      </div>

      {/* Additional Settings (cohorts, advanced) */}
      <div className="border-t border-gray-800">
        <CollapsibleSection
          id="cohorts"
          title="Cohort Builder"
          summary={cohortSummary}
          isExpanded={isExpanded('cohorts')}
          onToggle={() => toggle('cohorts')}
        >
          <CohortBuilder />
        </CollapsibleSection>

        <CollapsibleSection
          id="advanced"
          title="Advanced Settings"
          summary={advancedSummary}
          isExpanded={isExpanded('advanced')}
          onToggle={() => toggle('advanced')}
        >
          <AdvancedSection />
        </CollapsibleSection>
      </div>

      <div className="px-4 py-3 text-[10px] text-gray-500 leading-relaxed border-t border-gray-800">
        Lock any variable to fix it, unlock to let the solver compute it. All unlocked values adjust automatically when you change a locked value.
      </div>
    </div>
  );
}
