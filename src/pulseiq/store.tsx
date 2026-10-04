import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { todayISO, initialState, baselineDays, changeDays, openingPrompt, nextQuestion, extractSymptoms, actionLevel, measurementsForPreset, presetSymptoms, type State, type Scenario, type Event, type Contact, type Role, type Medication, type SimulationDay, type SimulationPreset, type GuidedStory } from './engine';

type Store = { state: State; run: (scenario: Scenario) => void; startGuidedStory: (story: GuidedStory) => void; selectSimulationPreset: (preset: SimulationPreset) => void; setSimulationDay: (day: SimulationDay) => void; toggleSimulationSymptom: (name: string) => void; toggleSensorContact: () => void; answer: (text: string) => void; completeQuickCheckIn: (feeling: string) => void; addSymptom: (name: string) => void; notify: () => void; dismissNotificationModal: () => void; updateContact: (contact: Contact) => void; fillDemoContact: () => void; setContext: (key: 'medication' | 'cycle' | 'notes', value: string) => void; setReportGenerated: (value: boolean) => void; reset: () => void; setRole: (role: Role) => void; saveContact: () => void; addMedication: (m: Omit<Medication, 'id' | 'takenOn'>) => void; removeMedication: (id: number) => void; markTaken: (id: number) => void; tagContext: (tag: string) => void; confirmFine: () => void };
const Context = createContext<Store | null>(null);
let nextId = 2;
const event = (label: string, detail: string, kind: Event['kind']): Event => ({ id: nextId++, label, detail, kind });
export function PulseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  useEffect(() => {
    const saved = window.localStorage.getItem('pulseiq-role');
    if (saved === 'elderly' || saved === 'adult') setState(s => ({ ...s, role: saved }));
  }, []);
  const run = (scenario: Scenario) => setState(s => {
    if (scenario === 'stable') return { ...initialState, role: s.role, medications: s.medications, contact: s.contact, medication: s.medication, cycle: s.cycle, notes: s.notes, events: [...s.events, event('Stable scenario', 'Measurements remain within your usual pattern.', 'data')] };
    if (scenario === 'change') return { ...s, scenario, measurements: [...baselineDays, ...changeDays], symptoms: [], contextTags: [], feelingFine: false, messages: [{ role: 'assistant', text: openingPrompt }], step: 0, recheck: 'pending', notified: false, events: [...s.events, event('Day 1 · Sleep changed', 'Sleep fell to 5.5 hours; resting heart rate rose to 75 BPM.', 'data'), event('Day 2 · Pattern repeated', 'Sleep and activity remained below your usual range.', 'data'), event('Day 3 · Pattern shifted', 'Three signals changed together for three consecutive days.', 'change'), event('Check-in started', 'PulseIQ asked how you have been feeling.', 'conversation')] };
    if (s.scenario === 'stable') return s;
    const measurement = scenario === 'improved' ? { ...changeDays[2]!, day: 'Recheck', hr: 68, hrv: 52, sleep: 7.1, steps: 7200, recovery: 72 } : scenario === 'persistent' ? { ...changeDays[2]!, day: 'Recheck', hr: 80, sleep: 5.1, steps: 3500, recovery: 52 } : { ...changeDays[2]!, day: 'Recheck', hr: 86, hrv: 35, sleep: 4.5, steps: 2600, recovery: 42 };
    return { ...s, scenario, measurements: [...(s.measurements.length > 7 ? s.measurements : [...baselineDays, ...changeDays]), measurement], recheck: 'complete', feelingFine: false, events: [...s.events, event('Recheck · ' + (scenario === 'improved' ? 'Improving' : scenario === 'persistent' ? 'Still persistent' : 'Worsening'), scenario === 'improved' ? 'Measurements are moving closer to your usual pattern.' : 'The pattern remains away from your usual range. Additional support may be appropriate.', 'action')] };
  });
  const presetScenario = (preset: SimulationPreset, day: SimulationDay): Scenario => preset === 'baseline' || day === 1 ? 'stable' : day === 2 ? 'change' : 'persistent';
  const selectSimulationPreset = (preset: SimulationPreset) => setState(s => {
    const day: SimulationDay = 1;
    return { ...s, simulationPreset: preset, simulationDay: day, explainedShift: false, notificationModalOpen: false, scenario: presetScenario(preset, day), measurements: measurementsForPreset(preset, day), symptoms: [...presetSymptoms[preset]], contextTags: [], messages: [], step: 0, recheck: null, feelingFine: false, events: [...s.events, event(`Scenario selected · ${preset}`, 'Simulation reset to Day 1.', 'data')] };
  });
  const setSimulationDay = (day: SimulationDay) => setState(s => {
    const scenario = presetScenario(s.simulationPreset, day);
    return { ...s, simulationDay: day, scenario, measurements: measurementsForPreset(s.simulationPreset, day), messages: day === 1 ? [] : [{ role: 'assistant', text: openingPrompt }], step: 0, recheck: day === 3 ? 'pending' : null, notified: false, notificationModalOpen: false, feelingFine: false, explainedShift: false, events: [...s.events, event(`Day ${day} · ${s.simulationPreset}`, day === 1 ? 'Monitoring quietly; no alert is needed.' : day === 2 ? 'Watch and wait; PulseIQ is checking for lifestyle factors.' : 'Persistent pattern confirmed; an action plan is ready.', day === 3 ? 'change' : 'data')] };
  });
  const toggleSimulationSymptom = (name: string) => setState(s => {
    const symptoms = s.symptoms.some(symptom => symptom.name === name) ? s.symptoms.filter(symptom => symptom.name !== name) : [...s.symptoms, { name, severity: 'mild' }];
    return { ...s, symptoms, events: [...s.events, event(symptoms.some(symptom => symptom.name === name) ? 'Symptom added' : 'Symptom cleared', `${name} updated in the simulation.`, 'conversation')] };
  });
  const toggleSensorContact = () => setState(s => {
    const sensorContact = s.sensorContact < 70 ? 98 : 61;
    return { ...s, sensorContact, events: [...s.events, event(sensorContact < 70 ? 'Loose wearable simulated' : 'Sensor contact restored', sensorContact < 70 ? 'Low confidence — alerts are suppressed until contact improves.' : 'Reliable contact restored; pattern monitoring is active again.', 'data')] };
  });
  const startGuidedStory = (story: GuidedStory) => setState(s => {
    const preset: SimulationPreset = story === 'elderly-care' ? 'dehydration' : story === 'viral-onset' ? 'viral' : 'stress';
    const role = story === 'elderly-care' ? 'elderly' : s.role;
    const day: SimulationDay = story === 'false-alarm' ? 2 : 3;
    const contact = story === 'elderly-care' ? { ...s.contact, name: 'Sarah', relationship: 'Daughter', method: 'SMS', phone: '+1 (555) 382-9104', saved: true } : s.contact;
    if (typeof window !== 'undefined' && role) window.localStorage.setItem('pulseiq-role', role);
    return { ...s, role, contact, simulationPreset: preset, simulationDay: day, explainedShift: false, notificationModalOpen: false, scenario: presetScenario(preset, day), measurements: measurementsForPreset(preset, day), symptoms: [...presetSymptoms[preset]], contextTags: [], messages: [{ role: 'assistant', text: openingPrompt }], step: 0, recheck: day === 3 ? 'pending' : null, notified: false, feelingFine: false, events: [...s.events, event(`Guided story · ${story}`, `Loaded ${preset} Day ${day}.`, 'data')] };
  });
  const answer = (text: string) => {
    if (!text.trim() || state.step >= 3) return;
    setState(s => {
      const found = extractSymptoms(text);
      const symptoms = [...s.symptoms];
      for (const symptom of found) if (!symptoms.some(x => x.name === symptom.name)) symptoms.push(symptom);
      const step = s.step + 1;
      return { ...s, step, symptoms, messages: [...s.messages, { role: 'user', text: text.trim() }, { role: 'assistant', text: step < 3 ? nextQuestion(step, [...s.messages.filter(m => m.role === 'user').map(m => m.text), text.trim()], symptoms) : "Thanks. I've combined what you've shared with your recent health pattern. Your insight and next step are ready." }], events: [...s.events, event(step === 3 ? 'Check-in complete' : 'Check-in response', found.length ? `Reported: ${found.map(x => x.name).join(', ')}.` : 'Context added to the check-in.', 'conversation')] };
    });
  };
  const completeQuickCheckIn = (feeling: string) => setState(s => {
    if (s.scenario === 'stable' || s.step >= 3) return s;
    const symptom = feeling === 'fatigue' ? { name: 'fatigue', severity: 'mild' } : feeling === 'dizziness' ? { name: 'dizziness', severity: 'mild' } : feeling === 'headache' ? { name: 'mild headache', severity: 'mild' } : null;
    const nextSymptoms = symptom && !s.symptoms.some(item => item.name === symptom.name) ? [...s.symptoms, symptom] : s.symptoms;
    const factorText = s.contextTags.filter(tag => tag !== 'none').join(', ') || 'None of these';
    const feelingText = symptom?.name ?? 'Normal / feeling fine';
    return { ...s, step: 3, symptoms: nextSymptoms, feelingFine: !symptom, messages: [...s.messages, { role: 'user', text: `Factors: ${factorText}` }, { role: 'user', text: `Feeling: ${feelingText}` }, { role: 'assistant', text: 'Thanks. I have logged your check-in and prepared your next step.' }], events: [...s.events, event('Quick check-in complete', `Factors: ${factorText}. Feeling: ${feelingText}.`, 'conversation')] };
  });
  const addSymptom = (name: string) => setState(s => s.scenario === 'stable' || s.symptoms.some(x => x.name === name) ? s : ({ ...s, symptoms: [...s.symptoms, { name, severity: name === 'dizziness' ? 'mild' : 'moderate' }], events: [...s.events, event('Symptom reported', `${name} added to the simulated check-in.`, 'conversation')] }));
  const notify = () => setState(s => {
    const level = actionLevel(s);
    if (s.role !== 'elderly' || s.feelingFine || !s.contact.saved || !s.contact.name.trim() || !((level === 'orange' && s.contact.persistent) || (level === 'red' && s.contact.highConcern))) return s;
    const urgent = escalationTier(s) === 2;
    const dispatch = { id: nextId++, at: Date.now(), recipient: `${s.contact.name} · ${s.contact.relationship || 'Contact'} · ${s.contact.phone} via ${s.contact.method}`, reason: urgent ? 'High-concern change (acute signal)' : dispatchReasons[s.simulationPreset], urgent, message: caregiverMessage(s) };
    return { ...s, notified: true, notificationModalOpen: true, graceStartedAt: null, dispatches: [dispatch, ...s.dispatches], events: [...s.events, event(urgent ? 'Urgent trusted support alert' : 'Trusted support check-in requested', `Simulated ${s.contact.method} notification prepared for ${s.contact.name}.`, 'support')] };
  });
  const startGrace = () => setState(s => s.graceStartedAt ? s : ({ ...s, graceStartedAt: Date.now() }));
  const dismissNotificationModal = () => setState(s => ({ ...s, notificationModalOpen: false }));
  const updateContact = (contact: Contact) => setState(s => ({ ...s, contact: { ...contact, saved: contact.phone === s.contact.phone && contact.name === s.contact.name ? contact.saved : false } }));
  const fillDemoContact = () => setState(s => ({ ...s, contact: { ...s.contact, name: 'Sarah', relationship: 'Daughter', method: 'SMS', phone: '+1 (555) 382-9104', saved: true }, events: [...s.events, event('Demo contact restored', 'Sarah (Daughter) is verified for the simulation.', 'support')] }));
  const saveContact = () => setState(s => ({ ...s, contact: { ...s.contact, saved: true }, events: [...s.events, event('Trusted person saved', `${s.contact.name} (${s.contact.phone}) will only be messaged if your health condition escalates.`, 'support')] }));
  const setRole = (role: Role) => { if (typeof window !== 'undefined') window.localStorage.setItem('pulseiq-role', role); setState(s => ({ ...s, role })); };
  const addMedication = (m: Omit<Medication, 'id' | 'takenOn'>) => setState(s => ({ ...s, medications: [...s.medications, { ...m, id: nextId++, takenOn: [] }], events: [...s.events, event('Medication plan added', `${m.name} ${m.dose} at ${m.time}, ${m.start} to ${m.end}.`, 'action')] }));
  const removeMedication = (id: number) => setState(s => ({ ...s, medications: s.medications.filter(m => m.id !== id) }));
  const markTaken = (id: number) => setState(s => { const d = todayISO(); const med = s.medications.find(m => m.id === id); if (!med || med.takenOn.includes(d)) return s; return { ...s, medications: s.medications.map(m => m.id === id ? { ...m, takenOn: [...m.takenOn, d] } : m), events: [...s.events, event('Medication taken', `${med.name} ${med.dose} marked as taken today.`, 'action')] }; });
  const tagContext = (tag: string) => setState(s => s.contextTags.includes(tag) ? s : ({ ...s, explainedShift: s.simulationPreset === 'stress' && ['stress', 'late-night'].includes(tag), contextTags: [...s.contextTags.filter(t => t !== 'none'), tag].filter(t => tag !== 'none' || t === 'none'), events: [...s.events, event('Context added', tag === 'none' ? 'No lifestyle factor reported — the change stays flagged.' : `Reported: ${tag.replace('-', ' ')}. This is noted alongside the change before any alert.`, 'conversation')] }));
  const confirmFine = () => setState(s => ({ ...s, feelingFine: true, notified: false, notificationModalOpen: false, graceStartedAt: null, events: [...s.events, event("I'm feeling fine", 'You confirmed you are OK, so your trusted person was not messaged.', 'support')] }));
  const setContext = (key: 'medication' | 'cycle' | 'notes', value: string) => setState(s => ({ ...s, [key]: value }));
  const setReportGenerated = (value: boolean) => setState(s => ({ ...s, reportGenerated: value }));
  const reset = () => { nextId = 2; setState(s => ({ ...initialState, role: s.role })); };
  return <Context.Provider value={{ state, run, startGuidedStory, selectSimulationPreset, setSimulationDay, toggleSimulationSymptom, toggleSensorContact, answer, completeQuickCheckIn, addSymptom, notify, dismissNotificationModal, updateContact, fillDemoContact, setContext, setReportGenerated, reset, setRole, saveContact, addMedication, removeMedication, markTaken, tagContext, confirmFine }}>{children}</Context.Provider>;
}
export function usePulse() { const value = useContext(Context); if (!value) throw new Error('PulseIQ provider missing'); return value; }
