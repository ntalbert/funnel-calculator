import type { Scenario } from '../engine/types';

const STORAGE_KEY = 'strategnik_calculator_scenarios';

export function loadScenarios(): Scenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Scenario[];
  } catch {
    return [];
  }
}

export function saveScenarios(scenarios: Scenario[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch {
    // localStorage unavailable (private browsing, full, etc.)
  }
}

export function exportScenarioJSON(scenario: Scenario): string {
  return JSON.stringify(scenario, null, 2);
}

export function importScenarioJSON(json: string): Scenario | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed && parsed.inputs && parsed.name) {
      return {
        ...parsed,
        id: `scenario-${Date.now()}`,
        updatedAt: Date.now(),
      };
    }
    return null;
  } catch {
    return null;
  }
}
