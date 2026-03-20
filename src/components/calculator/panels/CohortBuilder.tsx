import { useCalculator } from '../state/context';
import { NumberInput } from '../shared/NumberInput';
import { Tooltip } from '../shared/Tooltip';
import { CAMPAIGN_PROFILES, TOOLTIPS, getQuarterLabel } from '../engine/defaults';
import type { CampaignProfileId } from '../engine/types';

export function CohortBuilder() {
  const { state, dispatch } = useCalculator();
  const { cohorts, simulationQuarters, startYear, startQ } = state.inputs;

  return (
    <div className="space-y-3">
      {cohorts.map((cohort, idx) => (
        <div key={cohort.id} className="rounded-lg border border-gray-700 bg-gray-800 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={cohort.name}
              onChange={(e) => dispatch({ type: 'SET_COHORT', cohortId: cohort.id, payload: { name: e.target.value } })}
              className="text-xs font-semibold text-white bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-24"
            />
            {cohorts.length > 1 && (
              <button
                onClick={() => dispatch({ type: 'REMOVE_COHORT', cohortId: cohort.id })}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                aria-label={`Remove ${cohort.name}`}
              >
                Remove
              </button>
            )}
          </div>

          {/* Campaign Profile Selector */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-300">Campaign Profile</label>
            <div className="grid grid-cols-3 gap-1">
              {(Object.keys(CAMPAIGN_PROFILES) as CampaignProfileId[]).map((pid) => {
                const profile = CAMPAIGN_PROFILES[pid];
                const isActive = cohort.profileId === pid;
                return (
                  <button
                    key={pid}
                    onClick={() => dispatch({ type: 'SET_COHORT_PROFILE', cohortId: cohort.id, profileId: pid })}
                    className={`px-2 py-1.5 text-[10px] rounded-md border transition-colors text-center leading-tight
                      ${isActive
                        ? 'border-[#1de2c4] bg-[#1de2c4]/10 text-[#1de2c4] font-medium'
                        : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'}`}
                  >
                    {profile.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Quarter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-300">Start Quarter</label>
            <select
              value={cohort.startQuarter}
              onChange={(e) => dispatch({ type: 'SET_COHORT', cohortId: cohort.id, payload: { startQuarter: parseInt(e.target.value) } })}
              className="w-full h-8 text-xs text-white rounded-md border border-gray-700 bg-gray-800 px-2 focus:outline-none focus:ring-1 focus:ring-[#1de2c4]"
            >
              {Array.from({ length: simulationQuarters }, (_, i) => (
                <option key={i} value={i}>{getQuarterLabel(i, startYear, startQ)}</option>
              ))}
            </select>
          </div>

          {/* Total Accounts */}
          <NumberInput
            label="Total Accounts"
            value={cohort.totalAccounts}
            onChange={(v) => dispatch({ type: 'SET_COHORT', cohortId: cohort.id, payload: { totalAccounts: Math.round(v) } })}
            tooltip={TOOLTIPS.totalAccounts}
            min={25}
            max={100000}
            step={25}
          />
          {!cohort.accountsOverridden && (
            <div className="text-[9px] text-gray-500 -mt-1">
              Auto-sized from ARR goal
            </div>
          )}
          {cohort.accountsOverridden && (
            <button
              onClick={() => dispatch({ type: 'SET_COHORT', cohortId: cohort.id, payload: { totalAccounts: 0, accountsOverridden: false } as any })}
              className="text-[9px] text-[#1de2c4]/60 hover:text-[#1de2c4] -mt-1 underline"
            >
              Reset to goal-driven
            </button>
          )}

          {/* Conversion Rate Overrides (collapsible) */}
          <details className="group">
            <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-gray-300 flex items-center gap-1">
              <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Customize conversion rates
              {cohort.conversionOverrides && <span className="w-1.5 h-1.5 rounded-full bg-[#1de2c4] inline-block" />}
            </summary>
            <div className="mt-2 space-y-2 pl-1">
              <NumberInput
                label="Account → Lead"
                value={cohort.conversionOverrides?.accountToLead ?? CAMPAIGN_PROFILES[cohort.profileId].conversionRates.accountToLead}
                onChange={(v) => dispatch({ type: 'SET_COHORT', cohortId: cohort.id, payload: { conversionOverrides: { ...cohort.conversionOverrides, accountToLead: v } } })}
                tooltip={TOOLTIPS.accountToLead}
                isPercent
                suffix="%"
                min={0.03}
                max={0.35}
                step={0.01}
              />
              <NumberInput
                label="Lead → MQL"
                value={cohort.conversionOverrides?.leadToMQL ?? CAMPAIGN_PROFILES[cohort.profileId].conversionRates.leadToMQL}
                onChange={(v) => dispatch({ type: 'SET_COHORT', cohortId: cohort.id, payload: { conversionOverrides: { ...cohort.conversionOverrides, leadToMQL: v } } })}
                tooltip={TOOLTIPS.leadToMQL}
                isPercent
                suffix="%"
                min={0.20}
                max={0.85}
                step={0.01}
              />
              <NumberInput
                label="MQL → Opportunity"
                value={cohort.conversionOverrides?.mqlToOpp ?? CAMPAIGN_PROFILES[cohort.profileId].conversionRates.mqlToOpp}
                onChange={(v) => dispatch({ type: 'SET_COHORT', cohortId: cohort.id, payload: { conversionOverrides: { ...cohort.conversionOverrides, mqlToOpp: v } } })}
                tooltip={TOOLTIPS.mqlToOpp}
                isPercent
                suffix="%"
                min={0.08}
                max={0.50}
                step={0.01}
              />
              <NumberInput
                label="Opp → Closed Won"
                value={cohort.conversionOverrides?.oppToClose ?? CAMPAIGN_PROFILES[cohort.profileId].conversionRates.oppToClose}
                onChange={(v) => dispatch({ type: 'SET_COHORT', cohortId: cohort.id, payload: { conversionOverrides: { ...cohort.conversionOverrides, oppToClose: v } } })}
                tooltip={TOOLTIPS.oppToClose}
                isPercent
                suffix="%"
                min={0.05}
                max={0.35}
                step={0.01}
              />
            </div>
          </details>
        </div>
      ))}

      {cohorts.length < 8 && (
        <button
          onClick={() => dispatch({ type: 'ADD_COHORT' })}
          className="w-full h-8 text-xs text-gray-500 border border-dashed border-gray-600 rounded-lg hover:border-gray-500 hover:text-gray-300 transition-colors"
        >
          + Add Cohort
        </button>
      )}
    </div>
  );
}
