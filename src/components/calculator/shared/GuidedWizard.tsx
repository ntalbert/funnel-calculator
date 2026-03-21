import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { useCalculator } from '../state/context';
import { WIZARD_STEPS, type WizardStep } from './wizardSteps';

function StepIcon({ icon }: { icon: WizardStep['icon'] }) {
  const cls = 'w-6 h-6 text-[#1de2c4]';
  switch (icon) {
    case 'funnel':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      );
    case 'target':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'percent':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      );
    case 'dollar':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'layers':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
    case 'chart':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
  }
}

const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

export function GuidedWizard() {
  const { state, dispatch } = useCalculator();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  const isOpen = state.ui.showWizard;
  const totalSteps = WIZARD_STEPS.length;
  const step = WIZARD_STEPS[currentStep];
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  const handleClose = useCallback(() => {
    dispatch({ type: 'HIDE_WIZARD' });
    setCurrentStep(0);
    setDirection(0);
  }, [dispatch]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleClose();
      return;
    }
    setDirection(1);
    setCurrentStep(prev => prev + 1);
  }, [isLastStep, handleClose]);

  const handleBack = useCallback(() => {
    setDirection(-1);
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((idx: number) => {
    setDirection(idx > currentStep ? 1 : -1);
    setCurrentStep(idx);
  }, [currentStep]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handleBack();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose, handleNext, handleBack]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => { if (e.target === overlayRef.current) handleClose(); }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-800 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Getting Started Guide"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">
                  Step {currentStep + 1} of {totalSteps}
                </p>
                <h2 className="text-lg font-semibold text-white">{step.title}</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1 rounded-md hover:bg-gray-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="relative overflow-hidden" style={{ minHeight: 320 }}>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="px-6 py-5"
                >
                  <div className="space-y-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-[#1de2c4]/10 flex items-center justify-center">
                      <StepIcon icon={step.icon} />
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-300 leading-relaxed">{step.description}</p>

                    {/* Tips */}
                    {step.tips.length > 0 && (
                      <div className="space-y-2 bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Key Tips</p>
                        <ul className="space-y-1.5">
                          {step.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1de2c4] mt-1.5 flex-shrink-0" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Section reference */}
                    {step.sectionRef && (
                      <div className="inline-flex items-center gap-1.5 text-[10px] text-gray-500 bg-gray-800 rounded-full px-3 py-1 border border-gray-700">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        Find this in: {step.sectionRef}
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
              {isFirstStep ? (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-medium text-gray-500 rounded-lg hover:bg-gray-800 hover:text-gray-300 transition-colors cursor-pointer"
                >
                  Skip
                </button>
              ) : (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-xs font-medium text-gray-400 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Back
                </button>
              )}

              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {WIZARD_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToStep(i)}
                    className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${
                      i === currentStep ? 'bg-[#1de2c4]' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    aria-label={`Go to step ${i + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="px-4 py-2 text-xs font-medium text-black bg-[#1de2c4] rounded-lg hover:bg-[#4ae8d0] transition-colors cursor-pointer"
              >
                {isLastStep ? 'Get Started' : 'Next'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
