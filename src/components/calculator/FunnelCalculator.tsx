import { motion } from 'motion/react';
import { CalculatorProvider } from './state/context';
import { TopBar } from './TopBar';
import { SolverInputPanel } from './panels/SolverInputPanel';
import { Dashboard } from './dashboard/Dashboard';
import { EmailCaptureModal } from './export/EmailCaptureModal';
import { ChartCaptureContainer } from './export/ChartCaptureContainer';
import { GuidedWizard } from './shared/GuidedWizard';

function CalculatorLayout() {
  return (
    <motion.div
      className="h-screen flex flex-col bg-black text-white"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Input Panel - hidden on mobile */}
        <div className="hidden lg:block">
          <SolverInputPanel />
        </div>
        {/* Dashboard */}
        <Dashboard />
      </div>
      <EmailCaptureModal />
      <ChartCaptureContainer />
      <GuidedWizard />
      {/* Mobile banner */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900 text-white text-xs text-center py-2 px-4 z-50">
        To customize inputs and create scenarios, open on a desktop browser.
      </div>
      {/* Footer disclaimer */}
      <div className="hidden lg:block text-[9px] text-gray-500 text-center py-1 border-t border-gray-800 flex-shrink-0">
        Default assumptions based on typical mid-market B2B SaaS patterns. Actual results vary significantly by industry, deal size, sales cycle, and campaign execution.
      </div>
    </motion.div>
  );
}

export default function FunnelCalculator() {
  return (
    <CalculatorProvider>
      <CalculatorLayout />
    </CalculatorProvider>
  );
}
