import { useEffect, useRef, useState } from 'react';
import { useCalculator } from '../state/context';
import { NumberInput } from '../shared/NumberInput';
import { Tooltip } from '../shared/Tooltip';
import { TOOLTIPS, CAMPAIGN_PROFILES, PIPELINE_BENCHMARKS } from '../engine/defaults';
import type { CompanyStage } from '../engine/types';

export function GoalsSection() {
  const { state, dispatch } = useCalculator();
  const { goals } = state.inputs;
  const notification = state.ui.aspNotification;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAdjustments, setShowAdjustments] = useState(false);

  // Auto-dismiss ASP notification after 8 seconds (only if table not expanded)
  useEffect(() => {
    if (notification && !showAdjustments) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        dispatch({ type: 'DISMISS_ASP_NOTIFICATION' });
        setShowAdjustments(false);
      }, 8000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notification, showAdjustments, dispatch]);

  // Reset expand state when notification dismissed
  useEffect(() => {
    if (!notification) setShowAdjustments(false);
  }, [notification]);

  // Build adjustment rows from scaling result (reference: ABM profile base rates)
  const adjustmentRows = notification?.scalingResult ? (() => {
    const s = notification.scalingResult;
    const base = CAMPAIGN_PROFILES.abm.conversionRates;
    return [
      { param: 'Win Rate', factor: `${s.oppToCloseAdj.toFixed(2)}\u00D7`, value: `${(base.oppToClose * s.oppToCloseAdj * 100).toFixed(0)}%` },
      { param: 'Sales Velocity', factor: '\u2014', value: `${s.salesVelocityDays}d` },
      { param: 'MQL\u2192Opp', factor: `${s.mqlToOppAdj.toFixed(2)}\u00D7`, value: `${(base.mqlToOpp * s.mqlToOppAdj * 100).toFixed(0)}%` },
      { param: 'Lead\u2192MQL', factor: `${s.leadToMQLAdj.toFixed(2)}\u00D7`, value: `${(base.leadToMQL * s.leadToMQLAdj * 100).toFixed(0)}%` },
      { param: 'CPL', factor: '\u2014', value: `$${s.suggestedCPL}` },
    ];
  })() : [];

  return (
    <div className="space-y-3">
      <NumberInput
        label="ARR Goal"
        value={goals.arrGoal}
        onChange={(v) => dispatch({ type: 'SET_GOALS', payload: { arrGoal: v } })}
        tooltip={TOOLTIPS.arrGoal}
        prefix="$"
        min={100000}
        max={100000000}
        step={100000}
      />
      <NumberInput
        label="Average Selling Price (ACV)"
        value={goals.averageSellingPrice}
        onChange={(v) => dispatch({ type: 'ASP_CHANGED', newASP: v })}
        tooltip={TOOLTIPS.averageSellingPrice}
        prefix="$"
        min={10000}
        max={1000000}
        step={5000}
      />
      {/* Company Stage Selector */}
      <div className="space-y-1">
        <label className="flex items-center text-xs font-medium text-gray-300">
          Company Stage
          <Tooltip content={TOOLTIPS.companyStage} />
        </label>
        <div className="grid grid-cols-3 gap-1">
          {(Object.keys(PIPELINE_BENCHMARKS) as CompanyStage[]).map((stage) => {
            const b = PIPELINE_BENCHMARKS[stage];
            const isActive = goals.companyStage === stage;
            return (
              <button
                key={stage}
                onClick={() => dispatch({ type: 'SET_GOALS', payload: { companyStage: stage } })}
                className={`px-2 py-1.5 text-[10px] rounded-md border transition-colors text-center leading-tight
                  ${isActive
                    ? 'border-[#1de2c4] bg-[#1de2c4]/10 text-[#1de2c4] font-medium'
                    : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'}`}
              >
                {b.label}
              </button>
            );
          })}
        </div>
        <div className="text-[9px] text-gray-500">
          Target: {PIPELINE_BENCHMARKS[goals.companyStage].ratio}:1 pipeline-to-marketing ratio
        </div>
      </div>

      {/* ASP Change Notification (PRD C.4) */}
      {notification && (
        <div className="rounded-lg bg-[#1de2c4]/10 border border-[#1de2c4]/30 px-3 py-2 text-[11px] text-[#1de2c4] transition-opacity duration-300">
          <div className="flex items-center justify-between">
            <div className="font-medium">
              Adjusted for {notification.bandLabel} deal dynamics
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DISMISS_ASP_NOTIFICATION' }); }}
              className="text-[#1de2c4]/50 hover:text-[#1de2c4] ml-2"
            >
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          {notification.adjustedFields.length > 0 && (
            <div className="text-[#1de2c4]/70 mt-0.5">
              Updated: {notification.adjustedFields.join(', ')}
            </div>
          )}
          {notification.preservedFields.length > 0 && (
            <div className="text-[#1de2c4]/60 mt-0.5">
              Custom values preserved: {notification.preservedFields.join(', ')}
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setShowAdjustments(!showAdjustments); }}
            className="text-[#1de2c4]/80 hover:text-[#1de2c4] underline mt-1 text-[10px]"
          >
            {showAdjustments ? 'Hide adjustments' : 'View adjustments'}
          </button>
          {showAdjustments && (
            <table className="w-full mt-1.5 text-[10px]">
              <thead>
                <tr className="text-[#1de2c4]/60">
                  <th className="text-left font-medium pb-0.5">Parameter</th>
                  <th className="text-right font-medium pb-0.5">Factor</th>
                  <th className="text-right font-medium pb-0.5">Value</th>
                </tr>
              </thead>
              <tbody>
                {adjustmentRows.map(row => (
                  <tr key={row.param} className="border-t border-[#1de2c4]/20">
                    <td className="py-0.5">{row.param}</td>
                    <td className="text-right py-0.5">{row.factor}</td>
                    <td className="text-right font-medium py-0.5">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
