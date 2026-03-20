import { useCalculator } from '../state/context';
import { NumberInput } from '../shared/NumberInput';
import { Tooltip } from '../shared/Tooltip';
import { TOOLTIPS } from '../engine/defaults';

export function AdvancedSection() {
  const { state, dispatch } = useCalculator();
  const { advanced, simulationQuarters } = state.inputs;

  return (
    <div className="space-y-3">
      <NumberInput
        label="Quarterly Dropout Rate"
        value={advanced.quarterlyDropoutRate}
        onChange={(v) => dispatch({ type: 'SET_ADVANCED', payload: { quarterlyDropoutRate: v } })}
        tooltip={TOOLTIPS.dropoutRate}
        isPercent
        suffix="%"
        min={0.05}
        max={0.40}
        step={0.01}
      />

      <NumberInput
        label="Median Sales Velocity"
        value={advanced.salesVelocityDays}
        onChange={(v) => dispatch({ type: 'SET_ADVANCED', payload: { salesVelocityDays: Math.round(v) } })}
        tooltip={TOOLTIPS.salesVelocity}
        suffix="days"
        min={45}
        max={365}
        step={5}
      />

      <NumberInput
        label="Max Velocity Improvement"
        value={advanced.maxVelocityImprovement}
        onChange={(v) => dispatch({ type: 'SET_ADVANCED', payload: { maxVelocityImprovement: v } })}
        tooltip={TOOLTIPS.velocityImprovement}
        isPercent
        suffix="%"
        min={0}
        max={0.50}
        step={0.05}
      />

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-300">Model Horizon</label>
        <select
          value={simulationQuarters}
          onChange={(e) => dispatch({ type: 'SET_SIMULATION_QUARTERS', value: parseInt(e.target.value) })}
          className="w-full h-8 text-xs text-white rounded-md border border-gray-700 bg-gray-800 px-2 focus:outline-none focus:ring-1 focus:ring-[#1de2c4]"
        >
          {[6, 8, 10, 12].map(n => (
            <option key={n} value={n}>{n} quarters ({n / 4} years)</option>
          ))}
        </select>
      </div>

      {/* Tier Multipliers */}
      <details className="group">
        <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-gray-300 flex items-center gap-1">
          <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Frequency tier multipliers
          <Tooltip content={TOOLTIPS.tierMultiplierSummary} />
        </summary>
        <div className="mt-2 space-y-2 pl-1">
          <NumberInput
            label="New Accounts"
            value={state.inputs.budget.frequencyConfig.tierMultipliers.new}
            onChange={(v) => {
              const tm = { ...state.inputs.budget.frequencyConfig.tierMultipliers, new: v };
              dispatch({ type: 'SET_FREQUENCY', payload: { tierMultipliers: tm } as any });
            }}
            tooltip={TOOLTIPS.tierMultiplierNew}
            suffix="x"
            min={0.5}
            max={3}
            step={0.1}
          />
          <NumberInput
            label="In-Progress (Q2+)"
            value={state.inputs.budget.frequencyConfig.tierMultipliers.inProgress}
            onChange={(v) => {
              const tm = { ...state.inputs.budget.frequencyConfig.tierMultipliers, inProgress: v };
              dispatch({ type: 'SET_FREQUENCY', payload: { tierMultipliers: tm } as any });
            }}
            tooltip={TOOLTIPS.tierMultiplierInProgress}
            suffix="x"
            min={0.5}
            max={4}
            step={0.1}
          />
          <NumberInput
            label="Past-Lead Stage"
            value={state.inputs.budget.frequencyConfig.tierMultipliers.pastLead}
            onChange={(v) => {
              const tm = { ...state.inputs.budget.frequencyConfig.tierMultipliers, pastLead: v };
              dispatch({ type: 'SET_FREQUENCY', payload: { tierMultipliers: tm } as any });
            }}
            tooltip={TOOLTIPS.tierMultiplierPastLead}
            suffix="x"
            min={0.5}
            max={5}
            step={0.1}
          />
        </div>
      </details>
    </div>
  );
}
