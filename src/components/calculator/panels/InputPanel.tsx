import { useCalculator } from '../state/context';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { GoalsSection } from './GoalsSection';
import { CohortBuilder } from './CohortBuilder';
import { BudgetSection } from './BudgetSection';
import { AdvancedSection } from './AdvancedSection';
import { CAMPAIGN_PROFILES } from '../engine/defaults';

export function InputPanel() {
  const { state, dispatch } = useCalculator();
  const { inputs, ui } = state;
  const isExpanded = (id: string) => ui.expandedSections.includes(id);
  const toggle = (id: string) => dispatch({ type: 'TOGGLE_SECTION', section: id });

  // Build summaries for collapsed sections
  const cohortSummary = `${inputs.cohorts.length} cohort${inputs.cohorts.length > 1 ? 's' : ''} · ${inputs.cohorts.reduce((a, c) => a + c.totalAccounts, 0).toLocaleString()} accounts`;
  const budgetSummary = `$${inputs.budget.blendedCPL} CPL · $${inputs.budget.frequencyConfig.costPerTouch}/touch · ${Math.round((inputs.budget.inHouseCreative ? 0.12 : inputs.budget.agencyPercent) * 100)}% agency`;
  const advancedSummary = `${Math.round(inputs.advanced.quarterlyDropoutRate * 100)}% dropout · ${inputs.advanced.salesVelocityDays}d velocity`;

  return (
    <div className="w-80 flex-shrink-0 bg-gray-900 border-r border-gray-800 overflow-y-auto h-full">
      <div className="py-2">
        <CollapsibleSection
          id="goals"
          title="Goals & Economics"
          isExpanded={isExpanded('goals')}
          onToggle={() => toggle('goals')}
        >
          <GoalsSection />
        </CollapsibleSection>

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
          id="budget"
          title="Budget Parameters"
          summary={budgetSummary}
          isExpanded={isExpanded('budget')}
          onToggle={() => toggle('budget')}
        >
          <BudgetSection />
        </CollapsibleSection>

        <CollapsibleSection
          id="advanced"
          title="Advanced Model Parameters"
          summary={advancedSummary}
          isExpanded={isExpanded('advanced')}
          onToggle={() => toggle('advanced')}
        >
          <AdvancedSection />
        </CollapsibleSection>
      </div>

      <div className="px-4 py-3 text-[10px] text-gray-500 leading-relaxed border-t border-gray-800">
        Defaults calibrated for mid-market B2B SaaS. Adjust if your funnel metrics differ.
      </div>
    </div>
  );
}
