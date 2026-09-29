import { createContext, useContext, useState, type ReactNode } from 'react';
import { initialState, baselineDays, changeDays, openingPrompt, nextQuestion, extractSymptoms, actionLevel, todayISO, type State, type Scenario, type Event, type Contact, type Role, type Medication } from './engine';

type Store = { state: State; run: (scenario: Scenario) => void; answer: (text: string) => void; addSymptom: (name: string) => void; notify: () => void; updateContact: (contact: Contact) => void; setContext: (key: 'medication' | 'cycle' | 'notes', value: string) => void; setReportGenerated: (value: boolean) => void; reset: () => void; setRole: (role: Role) => void; saveContact: () => void; addMedication: (m: Omit<Medication, 'id' | 'takenOn'>) => void; removeMedication: (id: number) => void; markTaken: (id: number) => void };
const Context = createContext<Store | null>(null);
let nextId = 2;
const event = (label: string, detail: string, kind: Event['kind']): Event => ({ id: nextId++, label, detail, kind });
export function PulseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const run = (scenario: Scenario) => setState(s => {
    if (scenario === 'stable') return { ...initialState, role: s.role, medications: s.medications, contact: s.contact, medication: s.medication, cycle: s.cycle, notes: s.notes, events: [...s.events, event('Stable scenario', 'Measurements remain within your usual pattern.', 'data')] };
    if (scenario === 'change') return { ...s, scenario, measurements: [...baselineDays, ...changeDays], symptoms: [], messages: [{ role: 'assistant', text: openingPrompt }], step: 0, recheck: 'pending', notified: false, events: [...s.events, event('Day 1 · Sleep changed', 'Sleep fell to 5.5 hours; resting heart rate rose to 75 BPM.', 'data'), event('Day 2 · Pattern repeated', 'Sleep and activity remained below your usual range.', 'data'), event('Day 3 · Meaningful change detected', 'Three signals changed together for three consecutive days.', 'change'), event('Check-in started', 'PulseIQ asked how you have been feeling.', 'conversation')] };
    if (s.scenario === 'stable') return s;
    const measurement = scenario === 'improved' ? { ...changeDays[2]!, day: 'Recheck', hr: 68, hrv: 52, sleep: 7.1, steps: 7200, recovery: 72 } : scenario === 'persistent' ? { ...changeDays[2]!, day: 'Recheck', hr: 80, sleep: 5.1, steps: 3500, recovery: 52 } : { ...changeDays[2]!, day: 'Recheck', hr: 86, hrv: 35, sleep: 4.5, steps: 2600, recovery: 42 };
    return { ...s, scenario, measurements: [...(s.measurements.length > 7 ? s.measurements : [...baselineDays, ...changeDays]), measurement], recheck: 'complete', events: [...s.events, event('Recheck · ' + (scenario === 'improved' ? 'Improving' : scenario === 'persistent' ? 'Still persistent' : 'Worsening'), scenario === 'improved' ? 'Measurements are moving closer to your usual pattern.' : 'The pattern remains away from your usual range. Additional support may be appropriate.', 'action')] };
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
  const addSymptom = (name: string) => setState(s => s.scenario === 'stable' || s.symptoms.some(x => x.name === name) ? s : ({ ...s, symptoms: [...s.symptoms, { name, severity: name === 'dizziness' ? 'mild' : 'moderate' }], events: [...s.events, event('Symptom reported', `${name} added to the simulated check-in.`, 'conversation')] }));
  const notify = () => setState(s => {
    const level = actionLevel(s);
    if (s.role !== 'elderly' || !s.contact.saved || !s.contact.name.trim() || !((level === 'orange' && s.scenario === 'persistent' && s.contact.persistent) || (level === 'red' && s.contact.highConcern))) return s;
    return { ...s, notified: true, events: [...s.events, event('Trusted support check-in requested', `Simulated ${s.contact.method} notification prepared for ${s.contact.name}.`, 'support')] };
  });
  const updateContact = (contact: Contact) => setState(s => ({ ...s, contact: { ...contact, saved: contact.phone === s.contact.phone && contact.name === s.contact.name ? contact.saved : false } }));
  const saveContact = () => setState(s => ({ ...s, contact: { ...s.contact, saved: true }, events: [...s.events, event('Trusted person saved', `${s.contact.name} (${s.contact.phone}) will only be messaged if your health condition escalates.`, 'support')] }));
  const setRole = (role: Role) => setState(s => ({ ...s, role }));
  const addMedication = (m: Omit<Medication, 'id' | 'takenOn'>) => setState(s => ({ ...s, medications: [...s.medications, { ...m, id: nextId++, takenOn: [] }], events: [...s.events, event('Medication plan added', `${m.name} ${m.dose} at ${m.time}, ${m.start} to ${m.end}.`, 'action')] }));
  const removeMedication = (id: number) => setState(s => ({ ...s, medications: s.medications.filter(m => m.id !== id) }));
  const markTaken = (id: number) => setState(s => { const d = todayISO(); const med = s.medications.find(m => m.id === id); if (!med || med.takenOn.includes(d)) return s; return { ...s, medications: s.medications.map(m => m.id === id ? { ...m, takenOn: [...m.takenOn, d] } : m), events: [...s.events, event('Medication taken', `${med.name} ${med.dose} marked as taken today.`, 'action')] }; });
  const setContext = (key: 'medication' | 'cycle' | 'notes', value: string) => setState(s => ({ ...s, [key]: value }));
  const setReportGenerated = (value: boolean) => setState(s => ({ ...s, reportGenerated: value }));
  const reset = () => { nextId = 2; setState(s => ({ ...initialState, role: s.role })); };
  return <Context.Provider value={{ state, run, answer, addSymptom, notify, updateContact, setContext, setReportGenerated, reset, setRole, saveContact, addMedication, removeMedication, markTaken }}>{children}</Context.Provider>;
}
export function usePulse() { const value = useContext(Context); if (!value) throw new Error('PulseIQ provider missing'); return value; }
