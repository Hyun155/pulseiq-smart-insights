import Groq from "groq-sdk";

export type AIReadyMetrics = {
  requiresAIGeneration: true;
  reason: "multiple-anomalies" | "unknown-pattern";
  metrics: Array<{ metric: string; value: number; average: number; changePercent: number; direction: "spike" | "drop" }>;
};

const fallback = "PulseIQ detected a health pattern that needs review. Recheck the measurements and consider discussing persistent or concerning changes with a healthcare professional.";

export async function generateAIExplanation(preProcessedMetricsJson: AIReadyMetrics): Promise<string> {
  if (!preProcessedMetricsJson.requiresAIGeneration) return fallback;
  const prompt = `Explain these privacy-safe health anomalies in no more than two concise sentences. Do not diagnose, infer a disease, or claim causation. Mention rechecking and professional care for persistent or concerning changes. Data: ${JSON.stringify(preProcessedMetricsJson)}`;
  const groqKey = process.env["GROQ_API_KEY"];
  if (!groqKey) return fallback;
  try {
    const groq = new Groq({ apiKey: groqKey });
    const completion = await groq.chat.completions.create({
      model: "allam-2-7b",
      max_tokens: 150,
      messages: [
        { role: "system", content: "You provide cautious, non-diagnostic health-pattern explanations." },
        { role: "user", content: prompt },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || fallback;
  } catch (error) {
    console.error("[PulseIQ Groq explanation] fallback", error);
    return fallback;
  }
}
