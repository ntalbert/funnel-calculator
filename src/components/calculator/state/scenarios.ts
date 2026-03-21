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

function isValidScenarioShape(parsed: unknown): parsed is { inputs: Record<string, unknown>; name: string; [key: string]: unknown } {
  if (!parsed || typeof parsed !== 'object') return false;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.name !== 'string' || !obj.name) return false;
  if (!obj.inputs || typeof obj.inputs !== 'object') return false;
  const inputs = obj.inputs as Record<string, unknown>;
  // Validate required nested structures
  if (!inputs.goals || typeof inputs.goals !== 'object') return false;
  if (!inputs.cohorts || !Array.isArray(inputs.cohorts) || inputs.cohorts.length === 0) return false;
  if (!inputs.budget || typeof inputs.budget !== 'object') return false;
  if (!inputs.advanced || typeof inputs.advanced !== 'object') return false;
  // Validate each cohort has required fields
  for (const c of inputs.cohorts) {
    if (!c || typeof c !== 'object') return false;
    const cohort = c as Record<string, unknown>;
    if (typeof cohort.id !== 'string') return false;
    if (typeof cohort.profileId !== 'string') return false;
    if (typeof cohort.totalAccounts !== 'number') return false;
  }
  return true;
}

export function importScenarioJSON(json: string): Scenario | null {
  try {
    const parsed = JSON.parse(json);
    if (!isValidScenarioShape(parsed)) return null;
    const now = Date.now();
    const scenario = {
      ...parsed,
      id: `scenario-${now}`,
      createdAt: (parsed as Record<string, unknown>).createdAt ?? now,
      updatedAt: now,
    };
    return scenario as unknown as Scenario;
  } catch {
    return null;
  }
}
