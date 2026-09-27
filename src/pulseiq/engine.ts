export type Measurement = { day: string; hr: number; hrv: number; sleep: number; sleepScore: number; deepSleep: number; remSleep: number; lightSleep: number; awake: number; steps: number; activeMinutes: number; exerciseMinutes: number; spo2: number; respiratoryRate: number; recovery: number };
export type Scenario = 'stable' | 'change' | 'improved' | 'persistent' | 'worsening';
export type Level = 'green' | 'yellow' | 'orange' | 'red';
export type Event = { id: number; label: string; detail: string; kind: 'data' | 'change' | 'conversation' | 'action' | 'support' };
export type Contact = { name: string; relationship: string; method: string; persistent: boolean; highConcern: boolean };
export type Message = { role: 'assistant' | 'user'; text: string };
export type Symptom = { name: string; severity: string };
export type State = { scenario: Scenario; measurements: Measurement[]; symptoms: Symptom[]; messages: Message[]; step: number; events: Event[]; recheck: 'pending' | 'complete' | null; notified: boolean; contact: Contact; medication: string; cycle: string; notes: string; reportGenerated: boolean };

export const baselineDays: Measurement[] = [
  { day: 'Mon', hr: 64, hrv: 57, sleep: 7.6, sleepScore: 84, deepSleep: 1.4, remSleep: 1.7, lightSleep: 4.1, awake: 0.4, steps: 8100, activeMinutes: 54, exerciseMinutes: 28, spo2: 98, respiratoryRate: 15, recovery: 78 }, { day: 'Tue', hr: 65, hrv: 55, sleep: 7.4, sleepScore: 82, deepSleep: 1.3, remSleep: 1.6, lightSleep: 4.2, awake: 0.3, steps: 7800, activeMinutes: 51, exerciseMinutes: 25, spo2: 97, respiratoryRate: 15, recovery: 76 },
  { day: 'Wed', hr: 63, hrv: 59, sleep: 7.8, sleepScore: 88, deepSleep: 1.5, remSleep: 1.8, lightSleep: 4.1, awake: 0.4, steps: 8500, activeMinutes: 62, exerciseMinutes: 34, spo2: 98, respiratoryRate: 14, recovery: 82 }, { day: 'Thu', hr: 66, hrv: 52, sleep: 7.1, sleepScore: 79, deepSleep: 1.2, remSleep: 1.5, lightSleep: 4, awake: 0.4, steps: 7300, activeMinutes: 47, exerciseMinutes: 22, spo2: 97, respiratoryRate: 16, recovery: 73 },
  { day: 'Fri', hr: 64, hrv: 58, sleep: 7.5, sleepScore: 85, deepSleep: 1.4, remSleep: 1.7, lightSleep: 4, awake: 0.4, steps: 8200, activeMinutes: 56, exerciseMinutes: 30, spo2: 98, respiratoryRate: 15, recovery: 80 }, { day: 'Sat', hr: 67, hrv: 51, sleep: 7.2, sleepScore: 80, deepSleep: 1.3, remSleep: 1.5, lightSleep: 4, awake: 0.4, steps: 7600, activeMinutes: 49, exerciseMinutes: 24, spo2: 97, respiratoryRate: 16, recovery: 74 },
  { day: 'Sun', hr: 62, hrv: 61, sleep: 7.9, sleepScore: 90, deepSleep: 1.6, remSleep: 1.8, lightSleep: 4.1, awake: 0.4, steps: 8900, activeMinutes: 65, exerciseMinutes: 36, spo2: 98, respiratoryRate: 14, recovery: 84 },
];
export const changeDays: Measurement[] = [
  { day: 'Day 1', hr: 75, hrv: 47, sleep: 5.5, sleepScore: 68, deepSleep: 1, remSleep: 1.3, lightSleep: 3, awake: 0.2, steps: 4200, activeMinutes: 30, exerciseMinutes: 12, spo2: 97, respiratoryRate: 17, recovery: 66 }, { day: 'Day 2', hr: 78, hrv: 44, sleep: 5.2, sleepScore: 64, deepSleep: 0.9, remSleep: 1.2, lightSleep: 2.9, awake: 0.2, steps: 3900, activeMinutes: 27, exerciseMinutes: 10, spo2: 97, respiratoryRate: 17, recovery: 61 },
  { day: 'Day 3', hr: 79, hrv: 42, sleep: 5, sleepScore: 61, deepSleep: 0.87, remSleep: 1.07, lightSleep: 3.06, awake: 0.47, steps: 3600, activeMinutes: 24, exerciseMinutes: 8, spo2: 97, respiratoryRate: 17, recovery: 58 },
];
export const ranges = { hr: [62, 67], hrv: [51, 62], sleep: [7, 8], steps: [7000, 9000], spo2: [95, 100], respiratoryRate: [14, 16], recovery: [70, 85] } as const;
export function calculateBaseline(days: Measurement[]) {
  const mean = (key: 'hr' | 'hrv' | 'sleep' | 'steps' | 'spo2' | 'respiratoryRate' | 'recovery') => days.reduce((sum, d) => sum + d[key], 0) / days.length;
  return { hr: mean('hr'), hrv: mean('hrv'), sleep: mean('sleep'), steps: mean('steps'), spo2: mean('spo2'), respiratoryRate: mean('respiratoryRate'), recovery: mean('recovery') };
}
export const baseline = calculateBaseline(baselineDays);
export function detect(measurements: Measurement[]) {
  const recent = measurements.slice(-3);
  const flags = recent.map(d => ({ hr: d.hr > ranges.hr[1] + 3, hrv: d.hrv < ranges.hrv[0] - 4, sleep: d.sleep < ranges.sleep[0] - .5, steps: d.steps < ranges.steps[0] * .85, recovery: d.recovery < ranges.recovery[0] - 5 }));
  const signalCount = (['hr', 'hrv', 'sleep', 'steps', 'recovery'] as const).filter(key => flags.every(f => f[key])).length;
  const persistent = recent.length === 3 && signalCount >= 2;
  const latest: Measurement = measurements.at(-1) ?? baselineDays.at(-1)!;
  const deviation = { hr: Math.round((latest.hr / baseline.hr - 1) * 100), hrv: Math.round((latest.hrv / baseline.hrv - 1) * 100), sleep: Math.round((latest.sleep / baseline.sleep - 1) * 100), steps: Math.round((latest.steps / baseline.steps - 1) * 100), recovery: Math.round((latest.recovery / baseline.recovery - 1) * 100) };
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
  medication: '', cycle: '', notes: '', reportGenerated: false,
};
