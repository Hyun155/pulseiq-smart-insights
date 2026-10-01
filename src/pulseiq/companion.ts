import { actionLevel, analyzeToday, detect, type State } from "./engine";

export const contextOptions = [
  { key: "late-night", label: "Late night" },
  { key: "alcohol", label: "Had alcohol" },
  { key: "travel", label: "Travelling" },
  { key: "stress", label: "Stressful days" },
  { key: "hard-workout", label: "Hard workout" },
  { key: "none", label: "None of these" },
] as const;
export type ContextTag = (typeof contextOptions)[number]["key"];

/** Plain-language meaning of each reading, for people unfamiliar with health terms. */
export const plainTerms: Record<string, string> = {
  hr: "Resting heart rate is how many times your heart beats per minute while you are relaxed. Lower and steady is usually a sign of good rest.",
  hrv: "Heart rate variability (HRV) is the small change in time between heartbeats. Higher usually means your body is relaxed and recovered.",
  sleep: "Total hours of sleep last night. Most adults feel best with 7–9 hours.",
  steps: "How much you have moved today, counted in steps.",
  spo2: "Blood oxygen (SpO₂) shows how much oxygen your blood carries. 95–100% is typical.",
  respiratoryRate: "How many breaths you take per minute at rest.",
  recovery: "A 0–100 score combining sleep, heart rate and HRV — how ready your body is for the day.",
};

export type CompanionView = {
  status: "monitoring" | "check-in" | "follow-up" | "urgent";
  headline: string;
  response: string;
  dailySummary: string;
  askContext: boolean;
};

const tagLabel = (t: string) => contextOptions.find((o) => o.key === t)?.label.toLowerCase().replace("had alcohol", "having alcohol").replace("late night", "a late night") ?? t;

/** Rule-based companion wording. Never diagnoses; safety level comes from actionLevel. */
export function buildCompanion(state: State): CompanionView {
  const level = actionLevel(state);
  const data = detect(state.measurements);
  const today = analyzeToday(data.latest, state.measurements);
  const out = today.outOfRange;
  const tags = state.contextTags.filter((t) => t !== "none");
  const dailySummary = out.length
    ? `Today ${out.map((m) => `your ${m.label.toLowerCase()} is ${m.status === "high" ? "above" : "below"} usual (${m.value})`).join(", ")}. Tap any reading below to see what it means.`
    : "All of today's readings are inside your usual range. Nothing needs your attention.";
  const status = level === "red" ? "urgent" : level === "orange" ? "follow-up" : level === "yellow" ? "check-in" : "monitoring";
  const contextLine = tags.length
    ? ` You mentioned ${tags.map(tagLabel).join(" and ")}, which often occurs alongside changes like these. We'll recheck tomorrow before raising any alert.`
    : "";
  const headline = {
    urgent: "Please seek support now",
    "follow-up": "This change has lasted — worth a closer look",
    "check-in": "Watch & wait for 24–48 hours",
    monitoring: "Quiet monitoring is on",
  }[status];
  const response = {
    urgent: "What you reported together with your readings is a reason to contact a health professional promptly. If symptoms are severe or sudden, seek urgent care.",
    "follow-up": "Your readings have stayed outside your usual range after a recheck. Consider talking to a healthcare professional, and keep tracking how you feel." + contextLine,
    "check-in": `Your body is working harder to recover today. Let's observe how you feel tomorrow. Your measurements have shifted from your usual pattern over ${data.duration} days.` + contextLine,
    monitoring: out.length ? "A reading or two moved a little today, but no multi-signal check-in is needed." : "No check-in is needed today. We'll stay quiet unless several signals shift together.",
  }[status];
  return { status, headline, response, dailySummary, askContext: !today.healthy && state.contextTags.length === 0 && status !== "urgent" };
}
