import type { Measurement } from "./engine";
import type { ActivityPlan } from "./activity";

export type SignalReason = {
  key: string;
  label: string;
  reading: string;
  usual: string;
  direction: "up" | "down";
  meaning: string;
  movement: string;
  nutrition: string;
};

export type NutritionGroup = { title: string; tone: "hydrate" | "fuel" | "limit"; items: string[] };

export type InsightsPlan = {
  capacity: number;
  capacityLabel: string;
  heartStrain: string;
  nervousSystem: string;
  sleepRestore: string;
  summary: string;
  hrGuardrail: string;
  fluidTarget: string;
  reasons: SignalReason[];
  nutrition: NutritionGroup[];
};

/** Deterministic rationale linking each deviated signal to today's plan. Guidance, not diagnosis. */
export function buildInsightsPlan(m: Measurement, plan: ActivityPlan, contextTags: string[], symptoms: string[]): InsightsPlan {
  const reasons: SignalReason[] = [];
  const hrUp = m.hr > 67, hrvDown = m.hrv < 51, sleepDown = m.sleep < 7, stepsDown = m.steps < 7000;
  const rrUp = m.respiratoryRate > 16, recDown = m.recovery < 65;
  if (hrUp) reasons.push({ key: "hr", label: "Resting heart rate", reading: `${m.hr} BPM`, usual: "62–67 BPM", direction: "up",
    meaning: `Your heart is beating about ${m.hr - 65} extra times a minute at rest — your body is working harder than usual to recover.`,
    movement: "Hard cardio would add to that workload, so today keeps effort easy.",
    nutrition: "Caffeine and very salty food raise heart rate further, so they are reduced today." });
  if (hrvDown) reasons.push({ key: "hrv", label: "Heart rate variability", reading: `${m.hrv} ms`, usual: "51–62 ms", direction: "down",
    meaning: "Lower HRV suggests your nervous system is in 'stress mode' with less room to relax and repair.",
    movement: "Slow breathing (4s in, 6s out) and easy walking help your body shift back toward rest mode.",
    nutrition: "Magnesium-rich foods such as leafy greens, nuts and yogurt support relaxation." });
  if (sleepDown) reasons.push({ key: "sleep", label: "Sleep", reading: `${m.sleep.toFixed(1)} h`, usual: "7–8 h", direction: "down",
    meaning: "Short sleep limits overnight repair, which lowers coordination and energy the next day.",
    movement: "Heavy lifting or intense sessions carry more strain and injury risk after short sleep.",
    nutrition: "Steady-energy meals avoid sugar crashes, and a caffeine cut-off at 1 pm protects tonight's sleep." });
  if (stepsDown) reasons.push({ key: "steps", label: "Daily activity", reading: `${m.steps.toLocaleString()} steps`, usual: "7,000–9,000", direction: "down",
    meaning: "You've been moving less than usual, which can lower energy and circulation.",
    movement: "Short, gentle walks spread through the day bring movement back without overdoing it.",
    nutrition: "Smaller, regular meals keep energy even while activity is lower." });
  if (rrUp) reasons.push({ key: "rr", label: "Breathing rate", reading: `${m.respiratoryRate}/min`, usual: "14–16/min", direction: "up",
    meaning: "A higher resting breathing rate often occurs alongside your body fighting strain, such as an early cold.",
    movement: "Rest is favoured over exercise until breathing rate settles.",
    nutrition: "Warm fluids and checking your temperature are suggested today." });
  if (recDown) reasons.push({ key: "rec", label: "Recovery score", reading: `${m.recovery} / 100`, usual: "65+", direction: "down",
    meaning: "Your combined signals show your body hasn't fully recharged.",
    movement: "Today's plan is shortened and lighter to match lower recovery.",
    nutrition: "Colourful vegetables, fruit and protein support repair." });

  const strain = [hrUp, hrvDown, sleepDown, rrUp, recDown].filter(Boolean).length;
  const capacity = Math.max(20, Math.min(95, Math.round(m.recovery * 0.9 + (hrUp ? -5 : 5))));
  const capacityLabel = plan.mode === "Rest" ? "Rest & seek advice" : strain >= 2 ? "Restorative" : strain === 1 ? "Moderate" : "Full training";
  const hrGuardrail = plan.mode === "Rest" ? "Avoid exercise today"
    : strain >= 2 ? "Keep heart rate below 110 BPM (Zone 1)"
    : strain === 1 ? "Keep heart rate around 110–130 BPM (Zone 2)"
    : "Heart rate 130–155 BPM is fine (Zone 3)";
  const alcohol = contextTags.includes("alcohol");
  const feverish = symptoms.some((s) => /fever|warm|ache/i.test(s));
  const liters = 2 + (hrUp ? 0.3 : 0) + (alcohol ? 0.4 : 0) + (feverish || rrUp ? 0.3 : 0);

  const hydrate = [`About ${liters.toFixed(1)} L of water through the day`];
  if (alcohol || hrUp || feverish) hydrate.push("Add one electrolyte drink or coconut water");
  hydrate.push("Warm herbal tea in the evening to wind down");
  const fuel = sleepDown || recDown
    ? ["Oats, eggs or wholegrain toast for breakfast", "Salmon, tofu or chicken with vegetables at lunch", "Spinach, nuts or yogurt for magnesium"]
    : ["Balanced plate: half vegetables, quarter protein, quarter wholegrains", "Banana or yogurt after exercise"];
  const limit: string[] = [];
  if (sleepDown || hrUp) limit.push("No caffeine after 1 pm");
  if (hrUp) limit.push("Energy drinks and very salty snacks");
  if (alcohol || sleepDown) limit.push("Alcohol tonight");
  limit.push("Heavy meals within 2–3 hours of bed");

  return {
    capacity, capacityLabel, hrGuardrail, fluidTarget: `${liters.toFixed(1)} L`,
    heartStrain: hrUp ? "Elevated" : "Normal",
    nervousSystem: hrvDown ? "Strained" : "Balanced",
    sleepRestore: sleepDown ? "Low" : "Good",
    summary: strain === 0 ? "Your signals are in your usual range — a normal, active day fits well."
      : strain === 1 ? "One signal is off your usual pattern, so today eases off slightly."
      : "Your body is prioritising recovery today. Keep demands light and rest well tonight.",
    reasons,
    nutrition: [
      { title: "Hydration & electrolytes", tone: "hydrate", items: hydrate },
      { title: "Meal fuelling", tone: "fuel", items: fuel },
      { title: "Limit or delay", tone: "limit", items: limit },
    ],
  };
}
