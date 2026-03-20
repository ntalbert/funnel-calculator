import { useCalculator } from '../state/context';
import { NumberInput } from '../shared/NumberInput';
import { TOOLTIPS } from '../engine/defaults';

export function BudgetSection() {
  const { state, dispatch } = useCalculator();
  const { budget } = state.inputs;

  return (
    <div className="space-y-3">
      <NumberInput
        label="Blended CPL"
        value={budget.blendedCPL}
        onChange={(v) => dispatch({ type: 'SET_BUDGET', payload: { blendedCPL: v } })}
        tooltip={TOOLTIPS.blendedCPL}
        prefix="$"
        min={250}
        max={2000}
        step={25}
      />

      <NumberInput
        label="Monthly Frequency"
        value={budget.frequencyConfig.monthlyFrequency}
        onChange={(v) => dispatch({ type: 'SET_FREQUENCY', payload: { monthlyFrequency: v } })}
        tooltip={TOOLTIPS.monthlyFrequency}
        suffix="touches/mo"
        min={1}
        max={25}
        step={1}
      />

      <NumberInput
        label="Cost per Touch"
        value={budget.frequencyConfig.costPerTouch}
        onChange={(v) => dispatch({ type: 'SET_FREQUENCY', payload: { costPerTouch: v } })}
        tooltip={TOOLTIPS.costPerTouch}
        prefix="$"
        min={0.50}
        max={25}
        step={0.50}
      />

      <NumberInput
        label="Quarterly Software Budget"
        value={budget.softwareCostPerQuarter}
        onChange={(v) => dispatch({ type: 'SET_BUDGET', payload: { softwareCostPerQuarter: v } })}
        tooltip={TOOLTIPS.softwareBudget}
        prefix="$"
        min={0}
        max={200000}
        step={1000}
      />

      {/* In-House Creative Toggle */}
      <div className="space-y-1">
        <label className="flex items-center text-xs font-medium text-gray-300">
          Content Production
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch({ type: 'SET_BUDGET', payload: { inHouseCreative: false } })}
            className={`flex-1 px-2 py-1.5 text-[10px] rounded-md border transition-colors
              ${!budget.inHouseCreative
                ? 'border-[#1de2c4] bg-[#1de2c4]/10 text-[#1de2c4] font-medium'
                : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}
          >
            Outsourced (40%)
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_BUDGET', payload: { inHouseCreative: true } })}
            className={`flex-1 px-2 py-1.5 text-[10px] rounded-md border transition-colors
              ${budget.inHouseCreative
                ? 'border-[#1de2c4] bg-[#1de2c4]/10 text-[#1de2c4] font-medium'
                : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}
          >
            In-House (12%)
          </button>
        </div>
      </div>

      {!budget.inHouseCreative && (
        <NumberInput
          label="Agency/Production %"
          value={budget.agencyPercent}
          onChange={(v) => dispatch({ type: 'SET_BUDGET', payload: { agencyPercent: v } })}
          tooltip={TOOLTIPS.agencyPercent}
          isPercent
          suffix="%"
          min={0.10}
          max={0.60}
          step={0.05}
        />
      )}
    </div>
  );
}
