import { AnimatePresence, motion } from 'motion/react';
import { useCalculator } from '../state/context';
import { HeroMetrics } from './HeroMetrics';
import { TimelineTab } from './TimelineTab';
import { BudgetTab } from './BudgetTab';
import { CohortsTab } from './CohortsTab';
import { DataTab } from './DataTab';
import { SensitivityTab } from './SensitivityTab';

const TABS = [
  { id: 'timeline' as const, label: 'Timeline' },
  { id: 'budget' as const, label: 'Budget' },
  { id: 'cohorts' as const, label: 'Cohorts' },
  { id: 'sensitivity' as const, label: 'Sensitivity' },
  { id: 'data' as const, label: 'Data' },
];

export function Dashboard() {
  const { state, dispatch } = useCalculator();
  const { activeTab } = state.ui;
  const { trapWarnings } = state.outputs.summary;

  return (
    <div className="flex-1 overflow-y-auto bg-black p-4 md:p-6">
      <HeroMetrics />

      {/* Trap Warnings (PRD 4.11.6) */}
      {trapWarnings.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {trapWarnings.map(trap => (
            <div key={trap.id} className="flex items-start gap-2 rounded-lg border border-amber-700 bg-amber-900/20 px-3 py-2">
              <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <p className="text-[11px] text-amber-300">{trap.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 mb-4 bg-gray-900 rounded-lg border border-gray-800 p-1 sticky top-0 z-10" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => dispatch({ type: 'SET_TAB', tab: tab.id })}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
              ${activeTab === tab.id
                ? 'bg-[#1de2c4] text-black'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div role="tabpanel">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {activeTab === 'timeline' && <TimelineTab />}
            {activeTab === 'budget' && <BudgetTab />}
            {activeTab === 'cohorts' && <CohortsTab />}
            {activeTab === 'sensitivity' && <SensitivityTab />}
            {activeTab === 'data' && <DataTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
