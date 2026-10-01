import type { Measurement } from "./engine";

export type ActivityPlan = {
  title: string;
  mode: string;
  duration: string;
  intensity: string;
  why: string;
  exercises: string[];
  recoveryConsiderations: string;
  diet: string[];
};

const has = (symptoms: string[], word: string) =>
  symptoms.some((s) => s.toLowerCase().includes(word));

/** Deterministic activity + diet plan from today's readings. Guidance only, never a diagnosis. */
export function planActivity(m: Measurement, symptoms: string[], contextTags: string[] = []): ActivityPlan {
  const redFlag = has(symptoms, "chest") || has(symptoms, "breath") || has(symptoms, "faint");
  const dizzy = has(symptoms, "dizz");
  const tired = has(symptoms, "fatigue") || has(symptoms, "tired");
  const feverish = has(symptoms, "fever") || has(symptoms, "warm") || has(symptoms, "ache");
  const hadAlcohol = contextTags.includes("alcohol");
  const highStress = contextTags.includes("stress");
  const lateNight = contextTags.includes("late-night");
  const lowSleep = m.sleep < 6.5;
  const highHr = m.hr > 70;
  const lowRecovery = m.recovery < 65;
  const lowSteps = m.steps < 6000;
  const strained = [lowSleep, highHr, lowRecovery].filter(Boolean).length;

  const diet: string[] = [
    "Drink water regularly — aim for about 8 glasses spread through the day.",
  ];
  if (lowSleep || tired)
    diet.push(
      "Choose steady-energy meals: oats, wholegrain rice or bread with eggs, fish, tofu or chicken.",
      "Limit caffeine after 2 pm so tonight's sleep has a better chance to recover.",
    );
  if (highHr)
    diet.push(
      "Go easy on coffee, energy drinks and very salty food while your heart rate is above usual.",
    );
  if (dizzy)
    diet.push("Don't skip meals — eat small regular portions and add a pinch of salt to soups if you feel light-headed.");
  if (lowRecovery)
    diet.push("Add colourful vegetables and fruit (spinach, broccoli, berries, oranges) to support recovery.");
  if (feverish)
    diet.unshift("Check your temperature if you can, rest, and keep water or an oral rehydration drink nearby.");
  if (hadAlcohol)
    diet.unshift("Prioritize electrolytes and B-vitamin foods today to support hydration after alcohol intake.");
  if (highStress || lateNight)
    diet.push("Choose magnesium-rich foods such as leafy greens, nuts or yogurt, and try chamomile tea in the evening.");
  diet.push("Have a light dinner 2–3 hours before bed; a warm drink like chamomile tea can help you wind down.");

  if (redFlag)
    return {
      title: "Rest today and seek medical advice",
      mode: "Rest",
      duration: "All day",
      intensity: "None",
      why: "Symptoms you reported alongside your changed readings are worth checking with a health professional before any exercise.",
      exercises: ["Sit or lie down comfortably", "Slow breathing: in for 4, out for 6, for a few minutes", "Contact a doctor or trusted person"],
      recoveryConsiderations: "Avoid exercise until you have spoken to a health professional. Seek urgent care if symptoms get worse.",
      diet,
    };
  if (strained >= 2 || dizzy)
    return {
      title: "Gentle recovery day",
      mode: "Active recovery",
      duration: "15–20 minutes",
      intensity: "Very light",
      why: `Your heart rate (${m.hr} BPM), sleep (${m.sleep} h) and recovery (${m.recovery}%) are off your usual pattern, so light movement is more helpful than a workout today.`,
      exercises: [
        "10-minute easy walk at a comfortable pace",
        "5 minutes of gentle stretching (neck, shoulders, hamstrings)",
        "Seated breathing exercise before bed",
        ...(dizzy ? ["Stand up slowly and keep something to hold nearby"] : []),
      ],
      recoveryConsiderations: "Skip intense or long workouts until sleep and heart rate return closer to your usual range.",
      diet,
    };
  if (strained === 1 || lowSteps || tired)
    return {
      title: "Light movement day",
      mode: "Light activity",
      duration: "25–30 minutes",
      intensity: "Light",
      why: lowSteps
        ? `You've taken ${m.steps.toLocaleString()} steps, below your usual 7,000–9,000. A little extra movement can help without overdoing it.`
        : "One of your readings is slightly off your usual range, so keep activity easy today.",
      exercises: ["20-minute brisk-but-comfortable walk", "Light yoga or mobility routine (10 minutes)", "Take the stairs a few times"],
      recoveryConsiderations: "Stop if you feel unusually tired, dizzy or short of breath.",
      diet,
    };
  return {
    title: "Normal training day",
    mode: "Normal activity",
    duration: "30–45 minutes",
    intensity: "Moderate",
    why: "Your readings are within your usual range, so a normal workout fits today.",
    exercises: ["30-minute jog, cycle or brisk walk", "Bodyweight strength: squats, push-ups, planks (2–3 rounds)", "5-minute cool-down stretch"],
    recoveryConsiderations: "Keep your usual sleep routine to maintain this pattern.",
    diet: [
      "Drink water before and after your workout.",
      "Balanced plate: half vegetables, a quarter protein, a quarter wholegrains.",
      "A banana or yogurt after exercise helps recovery.",
    ],
  };
}
