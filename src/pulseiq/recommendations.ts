export type Recommendation = {
  title: string;
  type: "diet" | "activity";
  actionItem: string;
  reason: string;
};

const matrix: Record<string, Recommendation[]> = {
  "HIGH_BLOOD_PRESSURE|LOW_ACTIVITY": [
    { title: "Choose a gentle walk", type: "activity", actionItem: "Take a comfortable 10–20 minute walk if you feel well enough.", reason: "Light regular movement supports cardiovascular health without requiring intense exertion." },
    { title: "Favor lower-sodium foods", type: "diet", actionItem: "Choose fresh foods and check labels for sodium at your next meal.", reason: "Reducing excess sodium can support blood-pressure management." },
  ],
  "HIGH_GLUCOSE|SEDENTARY": [
    { title: "Add movement after meals", type: "activity", actionItem: "Take a short easy walk after a meal when appropriate.", reason: "Post-meal movement can support glucose management." },
    { title: "Pair carbohydrates with protein", type: "diet", actionItem: "Choose a balanced meal with fiber, protein, and minimally processed carbohydrates.", reason: "Balanced meals may support steadier energy and glucose patterns." },
  ],
  "LOW_SLEEP|HIGH_STRESS": [
    { title: "Protect a wind-down period", type: "activity", actionItem: "Set aside 20 minutes for a quiet, screen-light routine before bed.", reason: "A consistent wind-down routine supports recovery and sleep regularity." },
  ],
};

const keyFor = (tags: string[]) => [...new Set(tags.map((tag) => tag.trim().toUpperCase()))].sort().join("|");

export function getRecommendations(userProfileTags: string[]): Recommendation[] {
  const normalized = [...new Set(userProfileTags.map((tag) => tag.trim().toUpperCase()))];
  const exact = matrix[keyFor(normalized)];
  if (exact) return exact.map((recommendation) => ({ ...recommendation }));
  return Object.entries(matrix)
    .filter(([key]) => key.split("|").every((tag) => normalized.includes(tag)))
    .flatMap(([, recommendations]) => recommendations.map((recommendation) => ({ ...recommendation })));
}
