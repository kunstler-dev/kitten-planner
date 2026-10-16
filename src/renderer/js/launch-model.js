// Launch roadmaps: built-in templates + user-added steps, with per-step progress in state.data.launch.
import { state } from './state.js';
import { LEGAL_PHASES, LEGAL_STEPS } from './data/launch-legal.js';
import { COMMERCIAL_PHASES, COMMERCIAL_STEPS } from './data/launch-commercial.js';

export const ROADMAPS = {
  legal: { phases: LEGAL_PHASES, steps: LEGAL_STEPS },
  commercial: { phases: COMMERCIAL_PHASES, steps: COMMERCIAL_STEPS },
};

/** Ordered steps of a roadmap (templates first within each phase, then custom ones). */
export function steps(kind) {
  const { phases, steps: base } = ROADMAPS[kind];
  const custom = state.data.launch.custom.filter((c) => c.kind === kind);
  const out = [];
  for (const phase of phases) {
    out.push(...base.filter((s) => s.phase === phase.id));
    out.push(...custom.filter((c) => c.phase === phase.id).map((c) => ({ ...c, custom: true })));
  }
  return out;
}

export function stepState(kind, id) {
  return state.data.launch[kind][id] || { status: 'todo', note: '', due: null, checks: [] };
}

export function progress(kind) {
  const list = steps(kind).filter((s) => !s.optional || stepState(kind, s.id).status !== 'todo');
  const done = list.filter((s) => stepState(kind, s.id).status === 'done').length;
  return { done, total: list.length, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
}

export function nextSteps(kind, n = 3) {
  return steps(kind)
    .filter((s) => !s.optional && stepState(kind, s.id).status !== 'done')
    .slice(0, n);
}
