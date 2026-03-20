import { useState } from 'react';
import { useCalculator } from './state/context';
import { exportScenarioJSON } from './state/scenarios';

export function TopBar() {
  const { state, dispatch } = useCalculator();
  const [scenarioName, setScenarioName] = useState('Scenario 1');
  const [showScenarioMenu, setShowScenarioMenu] = useState(false);

  const handleSave = () => {
    dispatch({ type: 'SAVE_SCENARIO', name: scenarioName });
  };

  const handleExportJSON = () => {
    const json = JSON.stringify({ name: scenarioName, inputs: state.inputs }, null, 2);
    navigator.clipboard.writeText(json);
  };

  return (
    <div className="h-14 border-b border-gray-800 bg-black flex items-center justify-between px-4 flex-shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <a href="/" className="text-sm font-bold text-white tracking-tight hover:text-gray-300 transition-colors">
          STRATEGNIK
        </a>
        <span className="text-gray-600">|</span>
        <span className="text-xs text-gray-400">Funnel Velocity Calculator</span>
      </div>

      {/* Center: Scenario Name */}
      <div className="hidden md:flex items-center gap-2">
        <input
          type="text"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          className="text-sm text-white font-medium bg-transparent border-none text-center focus:outline-none focus:ring-0 w-40"
          placeholder="Scenario name"
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
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
          <div className="relative">
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
                      onClick={() => { dispatch({ type: 'LOAD_SCENARIO', scenarioId: s.id }); setScenarioName(s.name); setShowScenarioMenu(false); }}
                      className="text-xs text-gray-300 hover:text-white flex-1 text-left"
                    >
                      {s.name}
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'DELETE_SCENARIO', scenarioId: s.id })}
                      className="text-xs text-gray-500 hover:text-red-400 ml-2"
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

        {/* Copy JSON */}
        <button
          onClick={handleExportJSON}
          className="hidden md:flex items-center p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
          title="Copy scenario JSON to clipboard"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
