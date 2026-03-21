import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { useCalculator } from './state/context';

export function TopBar() {
  const { state, dispatch } = useCalculator();
  const [scenarioName, setScenarioName] = useState('Scenario 1');
  const [showScenarioMenu, setShowScenarioMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync scenario name when a scenario is loaded
  const activeScenario = state.scenarios.find(s => s.id === state.activeScenarioId);
  useEffect(() => {
    if (activeScenario) setScenarioName(activeScenario.name);
  }, [activeScenario]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!showScenarioMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowScenarioMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showScenarioMenu]);

  const handleClose = useCallback(() => setShowScenarioMenu(false), []);

  const { solver } = state;
  const lockedCount = Object.values(solver.locks).filter(Boolean).length;
  const derivedCount = Object.values(solver.locks).filter(v => !v).length;
  const isSolved = solver.result.feasibility === 'solved';

  const handleSave = () => {
    dispatch({ type: 'SAVE_SCENARIO', name: scenarioName });
  };

  return (
    <div className="h-14 border-b border-gray-800 bg-black flex items-center justify-between px-4 flex-shrink-0">
      {/* Left: Logo + Solver Status */}
      <div className="flex items-center gap-3">
        <a href="/" className="text-sm font-bold text-white tracking-tight hover:text-gray-300 transition-colors">
          STRATEGNIK
        </a>
        <span className="text-gray-600">|</span>
        <span className="text-xs text-gray-400">Funnel Velocity Calculator</span>
        <motion.span
          className={`hidden lg:inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
            isSolved
              ? 'bg-[#1de2c4]/10 text-[#1de2c4] border-[#1de2c4]/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isSolved ? 'bg-[#1de2c4]' : 'bg-amber-400'}`} />
          {lockedCount} locked, {derivedCount} derived
        </motion.span>
      </div>

      {/* Center: Scenario Name */}
      <div className="hidden md:flex items-center gap-2">
        <input
          type="text"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          className="text-sm text-white font-medium bg-transparent border-none text-center focus:outline-none focus:ring-0 w-40"
          placeholder="Scenario name"
          aria-label="Scenario name"
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Guide */}
        <button
          onClick={() => dispatch({ type: 'SHOW_WIZARD' })}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
          aria-label="Open getting started guide"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Guide
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Save
        </button>

        {/* Scenarios dropdown */}
        {state.scenarios.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowScenarioMenu(!showScenarioMenu)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Scenarios ({state.scenarios.length})
            </button>
            {showScenarioMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-gray-900 rounded-lg shadow-lg border border-gray-700 z-50 py-1">
                {state.scenarios.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-800">
                    <button
                      onClick={() => { dispatch({ type: 'LOAD_SCENARIO', scenarioId: s.id }); handleClose(); }}
                      className="text-xs text-gray-300 hover:text-white flex-1 text-left"
                    >
                      {s.name}
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'DELETE_SCENARIO', scenarioId: s.id })}
                      className="text-xs text-gray-500 hover:text-red-400 ml-2"
                      aria-label={`Delete scenario ${s.name}`}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Export */}
        <button
          onClick={() => dispatch({ type: 'SHOW_EMAIL_CAPTURE' })}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-black bg-[#1de2c4] rounded-lg hover:bg-[#4ae8d0] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export PDF
        </button>
      </div>
    </div>
  );
}
