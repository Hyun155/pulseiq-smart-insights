import { createContext, useContext, useState, type ReactNode } from 'react';
import { initialState, baselineDays, changeDays, prompts, extractSymptoms, type State, type Scenario, type Event, type Contact } from './engine';

type Store = { state: State; run: (scenario: Scenario) => void; answer: (text: string) => void; addSymptom: (name: string) => void; notify: () => void; updateContact: (contact: Contact) => void; setContext: (key: 'medication' | 'cycle' | 'notes', value: string) => void; reset: () => void };
const Context = createContext<Store | null>(null);
let nextId = 2;
const event = (label: string, detail: string, kind: Event['kind']): Event => ({ id: nextId++, label, detail, kind });
export function PulseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const run = (scenario: Scenario) => setState(s => {
    if (scenario === 'stable') return { ...initialState, contact: s.contact, medication: s.medication, cycle: s.cycle, notes: s.notes, events: [...s.events, event('Stable scenario', 'Measurements remain within your usual pattern.', 'data')] };
    if (scenario === 'change') return { ...s, scenario, measurements: [...baselineDays, ...changeDays], symptoms: [], messages: [{ role: 'assistant', text: prompts[0] }], step: 0, recheck: 'pending', notified: false, events: [...s.events, event('Day 1 · Sleep changed', 'Sleep fell to 5.5 hours; resting heart rate rose to 75 BPM.', 'data'), event('Day 2 · Pattern repeated', 'Sleep and activity remained below your usual range.', 'data'), event('Day 3 · Meaningful change detected', 'Three signals changed together for three consecutive days.', 'change'), event('Check-in started', 'PulseIQ asked how you have been feeling.', 'conversation')] };
    const measurement = scenario === 'improved' ? { day: 'Recheck', hr: 68, sleep: 7.1, steps: 7200 } : scenario === 'persistent' ? { day: 'Recheck', hr: 80, sleep: 5.1, steps: 3500 } : { day: 'Recheck', hr: 86, sleep: 4.5, steps: 2600 };
    return { ...s, scenario, measurements: [...(s.measurements.length > 7 ? s.measurements : [...baselineDays, ...changeDays]), measurement], recheck: 'complete', events: [...s.events, event('Recheck · ' + (scenario === 'improved' ? 'Improving' : scenario === 'persistent' ? 'Still persistent' : 'Worsening'), scenario === 'improved' ? 'Measurements are moving closer to your usual pattern.' : 'The pattern remains away from your usual range. Additional support may be appropriate.', 'action')] };
  });
  const answer = (text: string) => {
    if (!text.trim() || state.step >= 3) return;
    setState(s => {
      const found = extractSymptoms(text);
      const symptoms = [...s.symptoms];
      for (const symptom of found) if (!symptoms.some(x => x.name === symptom.name)) symptoms.push(symptom);
      const step = s.step + 1;
      return { ...s, step, symptoms, messages: [...s.messages, { role: 'user', text: text.trim() }, { role: 'assistant', text: step < 3 ? prompts[step] : "Thanks. I've combined what you've shared with your recent health pattern. Your insight and next step are ready." }], events: [...s.events, event(step === 3 ? 'Check-in complete' : 'Check-in response', found.length ? `Reported: ${found.map(x => x.name).join(', ')}.` : 'Context added to the check-in.', 'conversation')] };
    });
  };
  const addSymptom = (name: string) => setState(s => ({ ...s, symptoms: s.symptoms.some(x => x.name === name) ? s.symptoms : [...s.symptoms, { name, severity: name === 'dizziness' ? 'mild' : 'moderate' }], events: [...s.events, event('Symptom reported', `${name} added to the simulated check-in.`, 'conversation')] }));
  const notify = () => setState(s => ({ ...s, notified: true, events: [...s.events, event('Trusted support check-in requested', `Simulated ${s.contact.method} notification prepared for ${s.contact.name}.`, 'support')] }));
  const updateContact = (contact: Contact) => setState(s => ({ ...s, contact }));
  const setContext = (key: 'medication' | 'cycle' | 'notes', value: string) => setState(s => ({ ...s, [key]: value }));
  const reset = () => { nextId = 2; setState(initialState); };
  return <Context.Provider value={{ state, run, answer, addSymptom, notify, updateContact, setContext, reset }}>{children}</Context.Provider>;
}
export function usePulse() { const value = useContext(Context); if (!value) throw new Error('PulseIQ provider missing'); return value; }
