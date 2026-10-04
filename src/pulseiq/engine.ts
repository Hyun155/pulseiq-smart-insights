export type Measurement = { day: string; hr: number; hrv: number; sleep: number; sleepScore: number; deepSleep: number; remSleep: number; lightSleep: number; awake: number; steps: number; activeMinutes: number; exerciseMinutes: number; spo2: number; respiratoryRate: number; recovery: number };
export type Scenario = 'stable' | 'change' | 'improved' | 'persistent' | 'worsening';
export type SimulationPreset = 'baseline' | 'viral' | 'dehydration' | 'stress';
export type SimulationDay = 1 | 2 | 3;
export type GuidedStory = 'elderly-care' | 'viral-onset' | 'false-alarm';
export type Level = 'green' | 'yellow' | 'orange' | 'red';
export type Event = { id: number; label: string; detail: string; kind: 'data' | 'change' | 'conversation' | 'action' | 'support' };
export type Contact = { name: string; relationship: string; method: string; phone: string; saved: boolean; persistent: boolean; highConcern: boolean };
export type Role = 'elderly' | 'adult';
export type Medication = { id: number; name: string; dose: string; time: string; start: string; end: string; takenOn: string[] };
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const activeMedications = (meds: Medication[], day = todayISO()) => meds.filter(m => m.start <= day && day <= m.end);
export type Message = { role: 'assistant' | 'user'; text: string };
export type Symptom = { name: string; severity: string };
export type Dispatch = { id: number; at: number; recipient: string; reason: string; urgent: boolean; message: string };
export type State = { scenario: Scenario; simulationPreset: SimulationPreset; simulationDay: SimulationDay; explainedShift: boolean; sensorContact: number; notificationModalOpen: boolean; measurements: Measurement[]; symptoms: Symptom[]; messages: Message[]; step: number; events: Event[]; recheck: 'pending' | 'complete' | null; notified: boolean; contact: Contact; medication: string; cycle: string; notes: string; reportGenerated: boolean; role: Role | null; medications: Medication[]; contextTags: string[]; feelingFine: boolean; dispatches: Dispatch[]; graceStartedAt: number | null };

const acuteSymptoms = ['chest discomfort', 'chest tightness', 'shortness of breath', 'severe pain', 'fainting'];
/** Level 2 = acute / high concern (SpO2 < 92%, chest or breathing symptoms, red level). Level 1 = subtle persistent deviation. */
export function escalationTier(state: State): 1 | 2 {
  const latest = state.measurements.at(-1);
  const acute = (latest && latest.spo2 < 92) || state.symptoms.some(s => acuteSymptoms.includes(s.name)) || state.scenario === 'worsening';
  return acute ? 2 : 1;
}
export const dispatchReasons: Record<SimulationPreset, string> = {
  baseline: 'Persistent change after recheck', viral: '3-Day Persistent Viral Onset Pattern', dehydration: '3-Day Persistent Orthostatic Strain', stress: '3-Day Persistent Stress & Sleep Debt',
};
export function caregiverMessage(state: State): string {
  const name = state.contact.name.trim() || 'there';
  const noted = state.symptoms.length ? ` (noted ${state.symptoms.map(s => s.name).join(', ')})` : '';
  if (escalationTier(state) === 2) return `Hi ${name}, PulseIQ noticed a high-concern change in Alex's readings${noted}. Please contact Alex as soon as possible. If Alex has chest pain or has fainted, call local emergency services (911/999).`;
  return `Hi ${name}, Alex's rest and activity have been a little different from usual for the past 3 days${noted}. A friendly call to see how they are doing would be lovely.`;
}

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
const scenarioDays: Record<Exclude<SimulationPreset, 'baseline'>, Measurement[]> = {
  viral: [
    { ...baselineDays[6]!, day: 'Day 1', hr: 70, hrv: 55, respiratoryRate: 16, sleep: 7.1, sleepScore: 76, awake: 0.7, recovery: 64 },
    { ...baselineDays[6]!, day: 'Day 2', hr: 76, hrv: 47, respiratoryRate: 17, sleep: 6.4, sleepScore: 65, deepSleep: 1.1, awake: 0.9, recovery: 54 },
    { ...baselineDays[6]!, day: 'Day 3', hr: 78, hrv: 37, respiratoryRate: 18, sleep: 5.8, sleepScore: 52, deepSleep: 0.8, awake: 1.3, recovery: 46 },
  ],
  dehydration: [
    { ...baselineDays[6]!, day: 'Day 1', hr: 69, steps: 6500, sleepScore: 76, recovery: 70 },
    { ...baselineDays[6]!, day: 'Day 2', hr: 73, steps: 4200, sleepScore: 65, recovery: 62 },
    { ...baselineDays[6]!, day: 'Day 3', hr: 76, steps: 3200, sleepScore: 58, recovery: 55 },
  ],
  stress: [
    { ...baselineDays[6]!, day: 'Day 1', hr: 68, deepSleep: 1.25, steps: 8200, recovery: 75 },
    { ...baselineDays[6]!, day: 'Day 2', hr: 72, deepSleep: 0.95, sleep: 6.6, sleepScore: 70, steps: 8200, recovery: 68 },
    { ...baselineDays[6]!, day: 'Day 3', hr: 74, hrv: 48, deepSleep: 0.8, sleep: 6.1, sleepScore: 64, steps: 8000, recovery: 61 },
  ],
};
export const simulationPresetLabels: Record<SimulationPreset, string> = {
  baseline: 'Baseline (Normal)', viral: 'Viral Onset', dehydration: 'Dehydration & Dizziness', stress: 'Stress & Sleep Debt',
};
export function measurementsForPreset(preset: SimulationPreset, day: SimulationDay): Measurement[] {
  return preset === 'baseline' ? baselineDays : [...baselineDays, ...scenarioDays[preset].slice(0, day)];
}
export const presetSymptoms: Record<SimulationPreset, Symptom[]> = {
  baseline: [], viral: [{ name: 'feverish', severity: 'mild' }, { name: 'muscle aches', severity: 'mild' }, { name: 'fatigue', severity: 'mild' }], dehydration: [{ name: 'dizziness', severity: 'moderate' }, { name: 'lethargy', severity: 'mild' }], stress: [{ name: 'brain fog', severity: 'mild' }, { name: 'tension', severity: 'mild' }, { name: 'tired eyes', severity: 'mild' }],
};
export const ranges = { hr: [62, 67], hrv: [51, 62], sleep: [7, 8], steps: [7000, 9000], spo2: [95, 100], respiratoryRate: [14, 16], recovery: [70, 85] } as const;
export type MetricKey = 'hr' | 'hrv' | 'sleep' | 'steps' | 'spo2' | 'respiratoryRate' | 'recovery';
export type BaselineStats = { mean: number; standardDeviation: number; lower: number; upper: number; sampleSize: number; windowDays: number; dayAware: boolean };
const metricKeys: MetricKey[] = ['hr', 'hrv', 'sleep', 'steps', 'spo2', 'respiratoryRate', 'recovery'];
const dayName = (day: string) => day.slice(0, 3).toLowerCase();

function weightedStats(days: Measurement[], key: MetricKey): BaselineStats {
  const weights = days.map((_, index) => index + 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const mean = days.reduce((sum, day, index) => sum + day[key] * weights[index]!, 0) / totalWeight;
  const variance = days.reduce((sum, day, index) => sum + weights[index]! * (day[key] - mean) ** 2, 0) / totalWeight;
  const standardDeviation = Math.sqrt(variance);
  const margin = Math.max(standardDeviation, Math.abs(mean) * 0.01, 0.1);
  return { mean, standardDeviation, lower: mean - margin, upper: mean + margin, sampleSize: days.length, windowDays: days.length, dayAware: false };
}

export function calculateBaseline(days: Measurement[], window = 28): Record<MetricKey, number> {
  const selected = days.slice(-window);
  return Object.fromEntries(metricKeys.map(key => [key, weightedStats(selected, key).mean])) as Record<MetricKey, number>;
}

export function calculateBaselineStats(days: Measurement[], window = 28): Record<MetricKey, BaselineStats> {
  const selected = days.slice(-window);
  const fallback = selected.length ? selected : baselineDays;
  const latestDay = fallback.at(-1)?.day ?? '';
  const matchingDays = fallback.filter(day => dayName(day.day) === dayName(latestDay));
  return Object.fromEntries(metricKeys.map(key => {
    const dayAware = matchingDays.length >= 2;
    const stats = weightedStats(dayAware ? matchingDays : fallback, key);
    return [key, { ...stats, windowDays: fallback.length, dayAware }];
  })) as Record<MetricKey, BaselineStats>;
}

export const baseline = calculateBaseline(baselineDays);
function baselineHistory(measurements: Measurement[]) {
  const history = measurements.length > baselineDays.length ? measurements.slice(0, -3) : measurements;
  return history.length >= 3 ? history : baselineDays;
}
export function detect(measurements: Measurement[]) {
  const recent = measurements.slice(-3);
  const stats = calculateBaselineStats(baselineHistory(measurements));
  const flags = recent.map(d => Object.fromEntries(metricKeys.map(key => [key, d[key] < stats[key].lower || d[key] > stats[key].upper])) as Record<MetricKey, boolean>);
  const signalCount = (['hr', 'hrv', 'sleep', 'steps', 'recovery'] as const).filter(key => flags.every(f => f[key])).length;
  const persistent = recent.length === 3 && signalCount >= 2;
  const latest: Measurement = measurements.at(-1) ?? baselineDays.at(-1)!;
  const deviation = Object.fromEntries(metricKeys.map(key => [key, Math.round((latest[key] / stats[key].mean - 1) * 100)])) as Record<MetricKey, number>;
  const trend = recent.length === 3 && (recent[0]?.hr ?? 0) < (recent[1]?.hr ?? 0) && (recent[1]?.hr ?? 0) <= (recent[2]?.hr ?? 0);
  return { latest, signalCount, persistent, deviation, trend, stats, duration: flags.filter(f => Object.values(f).filter(Boolean).length >= 2).length };
}
export function actionLevel(state: State): Level {
  if (state.sensorContact < 70) return 'green';
  if (state.explainedShift) return 'green';
  if (state.scenario === 'worsening' || state.symptoms.some(s => ['chest discomfort', 'shortness of breath', 'severe pain'].includes(s.name))) return 'red';
  if (state.simulationDay === 3 && state.simulationPreset !== 'baseline') return 'orange';
  if (state.simulationDay === 2 && state.simulationPreset !== 'baseline') return 'yellow';
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
  scenario: 'stable', simulationPreset: 'baseline', simulationDay: 1, explainedShift: false, sensorContact: 98, notificationModalOpen: false, measurements: baselineDays, symptoms: [], messages: [], step: 0,
  events: [{ id: 1, label: 'Baseline established', detail: 'Seven days of simulated wearable data define your usual pattern.', kind: 'data' }],
  recheck: null, notified: false, contact: { name: 'Sarah', relationship: 'Daughter', method: 'SMS', phone: '+1 (555) 382-9104', saved: true, persistent: true, highConcern: true },
  medication: '', cycle: '', notes: '', reportGenerated: false, role: null, medications: [], contextTags: [], feelingFine: false, dispatches: [], graceStartedAt: null,
};

export type MetricStatus = 'normal' | 'high' | 'low';
export type MetricAnalysis = { key: string; label: string; value: string; usual: string; status: MetricStatus; change: number; meaning: string; confidence: string };
const metricMeta = [
  { key: 'hr', label: 'Resting heart rate', unit: ' BPM', high: 'A higher resting heart rate often appears alongside short sleep, stress, dehydration, caffeine, or your body fighting off strain.', low: 'A lower resting heart rate than usual is often seen with good recovery or high fitness.' },
  { key: 'hrv', label: 'Heart rate variability', unit: ' ms', high: 'Higher HRV usually reflects good recovery and a relaxed nervous system.', low: 'Lower HRV often appears when the body is under strain — poor sleep, stress, heavy training, or feeling unwell.' },
  { key: 'sleep', label: 'Sleep', unit: ' h', high: 'Longer sleep than usual can reflect catching up on rest or recovering from strain.', low: 'Short sleep reduces recovery and commonly occurs alongside higher heart rate and lower energy the next day.' },
  { key: 'steps', label: 'Daily steps', unit: '', high: 'More activity than usual — a sign of good energy levels.', low: 'Lower activity may reflect tiredness, a busy schedule, or not feeling your best.' },
  { key: 'spo2', label: 'Blood oxygen (SpO₂)', unit: '%', high: '', low: 'Oxygen below 95% is worth rechecking; if it stays low or comes with breathlessness, seek medical advice.' },
  { key: 'respiratoryRate', label: 'Respiratory rate', unit: '/min', high: 'A slightly faster breathing rate at rest can appear alongside strain, poor sleep, or illness.', low: 'A slower breathing rate than usual is generally not a concern at rest.' },
  { key: 'recovery', label: 'Recovery score', unit: '/100', high: 'Your body appears well recovered and ready for normal activity.', low: 'Low recovery suggests your body may benefit from lighter activity and extra rest today.' },
] as const;
export function analyzeToday(m: Measurement, measurements: Measurement[] = baselineDays) {
  const stats = calculateBaselineStats(measurements.length > baselineDays.length ? measurements.slice(0, -3) : measurements);
  const metrics: MetricAnalysis[] = metricMeta.map(meta => {
    const v = m[meta.key]; const reference = stats[meta.key];
    const status: MetricStatus = v > reference.upper ? 'high' : v < reference.lower ? 'low' : 'normal';
    return { key: meta.key, label: meta.label, value: `${meta.key === 'steps' ? v.toLocaleString() : v}${meta.unit}`, usual: `${meta.key === 'steps' ? `${Math.round(reference.lower).toLocaleString()}–${Math.round(reference.upper).toLocaleString()}` : `${reference.lower.toFixed(1)}–${reference.upper.toFixed(1)}`}${meta.unit}`, status, change: Math.round((v / reference.mean - 1) * 100), confidence: `mean ${reference.mean.toFixed(1)} ± ${reference.standardDeviation.toFixed(1)}${meta.unit}`, meaning: status === 'normal' ? 'Within your personalized confidence range.' : status === 'high' ? (meta.high || 'Above your personalized confidence range.') : meta.low };
  });
  const out = metrics.filter(x => x.status !== 'normal' && !(x.key === 'spo2' && x.status === 'high'));
  const overall = out.length === 0 ? 'Healthy — all signals are within your usual pattern today.' : out.length <= 2 ? `Mostly healthy — ${out.length} signal${out.length > 1 ? 's are' : ' is'} outside your usual range.` : `Needs attention — ${out.length} signals moved away from your usual pattern together.`;
  return { metrics, outOfRange: out, overall, healthy: out.length === 0 };
}
