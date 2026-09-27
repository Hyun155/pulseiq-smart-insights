export type Measurement = { day: string; hr: number; sleep: number; steps: number };
export type Scenario = 'stable' | 'change' | 'improved' | 'persistent' | 'worsening';
export type Level = 'green' | 'yellow' | 'orange' | 'red';
export type Event = { id: number; label: string; detail: string; kind: 'data' | 'change' | 'conversation' | 'action' | 'support' };
export type Contact = { name: string; relationship: string; method: string; persistent: boolean; highConcern: boolean };
export type Message = { role: 'assistant' | 'user'; text: string };
export type Symptom = { name: string; severity: string };
export type State = { scenario: Scenario; measurements: Measurement[]; symptoms: Symptom[]; messages: Message[]; step: number; events: Event[]; recheck: 'pending' | 'complete' | null; notified: boolean; contact: Contact; medication: string; cycle: string; notes: string };

export const baselineDays: Measurement[] = [
  { day: 'Mon', hr: 64, sleep: 7.6, steps: 8100 }, { day: 'Tue', hr: 65, sleep: 7.4, steps: 7800 },
  { day: 'Wed', hr: 63, sleep: 7.8, steps: 8500 }, { day: 'Thu', hr: 66, sleep: 7.1, steps: 7300 },
  { day: 'Fri', hr: 64, sleep: 7.5, steps: 8200 }, { day: 'Sat', hr: 67, sleep: 7.2, steps: 7600 },
  { day: 'Sun', hr: 62, sleep: 7.9, steps: 8900 },
];
export const changeDays: Measurement[] = [
  { day: 'Day 1', hr: 75, sleep: 5.5, steps: 4200 }, { day: 'Day 2', hr: 78, sleep: 5.2, steps: 3900 },
  { day: 'Day 3', hr: 79, sleep: 5, steps: 3600 },
];
export const ranges = { hr: [62, 67], sleep: [7, 8], steps: [7000, 9000] } as const;
export function calculateBaseline(days: Measurement[]) {
  const mean = (key: 'hr' | 'sleep' | 'steps') => days.reduce((sum, d) => sum + d[key], 0) / days.length;
  return { hr: mean('hr'), sleep: mean('sleep'), steps: mean('steps') };
}
export const baseline = calculateBaseline(baselineDays);
export function detect(measurements: Measurement[]) {
  const recent = measurements.slice(-3);
  const flags = recent.map(d => ({ hr: d.hr > ranges.hr[1] + 3, sleep: d.sleep < ranges.sleep[0] - .5, steps: d.steps < ranges.steps[0] * .85 }));
  const signalCount = (['hr', 'sleep', 'steps'] as const).filter(key => flags.every(f => f[key])).length;
  const persistent = recent.length === 3 && signalCount >= 2;
  const latest: Measurement = measurements.at(-1) ?? baselineDays.at(-1) ?? { day: 'Baseline', hr: 64, sleep: 7.5, steps: 8000 };
  const deviation = { hr: Math.round((latest.hr / baseline.hr - 1) * 100), sleep: Math.round((latest.sleep / baseline.sleep - 1) * 100), steps: Math.round((latest.steps / baseline.steps - 1) * 100) };
  const trend = recent.length === 3 && (recent[0]?.hr ?? 0) < (recent[1]?.hr ?? 0) && (recent[1]?.hr ?? 0) <= (recent[2]?.hr ?? 0);
  return { latest, signalCount, persistent, deviation, trend, duration: flags.filter(f => Object.values(f).filter(Boolean).length >= 2).length };
}
export function actionLevel(state: State): Level {
  if (state.scenario === 'worsening' || state.symptoms.some(s => ['chest discomfort', 'shortness of breath', 'severe pain'].includes(s.name))) return 'red';
  if (state.scenario === 'persistent' || (detect(state.measurements).persistent && state.symptoms.some(s => s.name === 'dizziness'))) return 'orange';
  if (detect(state.measurements).persistent) return 'yellow';
  return 'green';
}
export const openingPrompt = "I've noticed a few changes from your usual health pattern over the last few days. How have you been feeling?";
export function nextQuestion(step: number, answers: string[], symptoms: Symptom[]): string {
  const said = answers.join(' ').toLowerCase();
  if (step === 1) return /sleep|rest|insomnia|hours/.test(said)
    ? 'You mentioned sleep. Has your routine, stress level, or medication changed recently?'
    : symptoms.some(s => s.name === 'fatigue')
      ? 'You mentioned feeling tired. Have you been sleeping less than usual, or has anything in your routine changed?'
      : 'Have you been sleeping less than usual, or has anything in your routine changed?';
  if (symptoms.some(s => ['chest discomfort', 'shortness of breath', 'severe pain'].includes(s.name)))
    return 'You mentioned a concerning symptom. Has it started suddenly or become more severe? Please seek urgent care if it is severe or sudden.';
  if (symptoms.some(s => s.name === 'dizziness')) return 'You mentioned dizziness. Is it new, persistent, or getting worse? Have you had any other concerning symptoms?';
  return 'Have you experienced dizziness, shortness of breath, chest discomfort, or unusual pain?';
}
export function extractSymptoms(text: string): Symptom[] {
  const lower = text.toLowerCase();
  const result: Symptom[] = [];
  // Evaluate each clause independently so "no dizziness, but chest pain" still records chest pain.
  const clauses = lower.split(/\bbut\b|[.;]/);
  const present = (pattern: RegExp, negative: RegExp) => clauses.some(clause => pattern.test(clause) && !negative.test(clause));
  if (present(/tired|fatigue|exhausted|low energy/, /(?:no|not|never|haven't|don't|without)\s+(?:been\s+|feeling\s+)?(?:tired|fatigue|exhausted|low energy)/)) result.push({ name: 'fatigue', severity: /very|really|extremely/.test(lower) ? 'moderate' : 'mild' });
  if (present(/dizz|lightheaded/, /(?:no|not|never|haven't|don't|without)\s+(?:been\s+|feeling\s+)?(?:dizz|lightheaded)/)) result.push({ name: 'dizziness', severity: /little|mild|slight/.test(lower) ? 'mild' : 'moderate' });
  if (present(/short(ness)? of breath|breathless|can't breathe|difficulty breathing/, /(?:no|not|never|haven't|don't|without)\s+(?:been\s+|having\s+|experienced\s+)?(?:short(ness)? of breath|breathless|difficulty breathing)/)) result.push({ name: 'shortness of breath', severity: 'concerning' });
  if (present(/chest (pain|discomfort|pressure)/, /(?:no|not|never|haven't|don't|without)\s+(?:been\s+|having\s+|experienced\s+)?chest (pain|discomfort|pressure)/)) result.push({ name: 'chest discomfort', severity: 'concerning' });
  if (present(/severe pain/, /(?:no|not|never|haven't|don't|without)\s+(?:been\s+|having\s+|experienced\s+)?severe pain/)) result.push({ name: 'severe pain', severity: 'concerning' });
  return result;
}
export const initialState: State = {
  scenario: 'stable', measurements: baselineDays, symptoms: [], messages: [], step: 0,
  events: [{ id: 1, label: 'Baseline established', detail: 'Seven days of simulated wearable data define your usual pattern.', kind: 'data' }],
  recheck: null, notified: false, contact: { name: 'Sarah', relationship: 'Daughter', method: 'SMS', persistent: true, highConcern: true },
  medication: '', cycle: '', notes: '',
};
