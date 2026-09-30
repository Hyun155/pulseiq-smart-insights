import { createServerFn } from "@tanstack/react-start";
import Groq from "groq-sdk";
import { z } from "zod";

const MODEL = "allam-2-7b";
const COMPANION_FALLBACK = JSON.stringify({
  status: "stable",
  headline: "Rule-based monitoring remains available.",
  dailySummary: "AI explanation is temporarily unavailable. Your measurements are still being compared with your personal baseline.",
  metricInsights: [],
  response: "I could not reach the AI service right now. Continue using the rule-based guidance and try again later.",
  question: null,
  recommendations: [],
});
const INSIGHTS_FALLBACK = JSON.stringify({
  recommendations: [],
  activity: {
    title: "Keep monitoring your usual pattern",
    mode: "Normal activity",
    duration: "As usual",
    intensity: "Comfortable",
    why: "Rule-based monitoring remains available while AI recommendations are unavailable.",
    exercises: [],
    recoveryConsiderations: "Listen to your body and follow your usual routine.",
  },
  changes: [],
});

async function askModel(instructions: string, payload: unknown, fallback: string): Promise<string> {
  try {
    const key = process.env["GROQ_API_KEY"];
    if (!key) return fallback;
    const groq = new Groq({ apiKey: key });
    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 150,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: JSON.stringify(payload) },
      ],
    });
    const content = completion.choices[0]?.message?.content?.trim();
    return content || fallback;
  } catch (error) {
    console.error("[PulseIQ Groq] falling back to local response", error);
    return fallback;
  }
}

const recommendationSchema = z.object({
  title: z.string(),
  explanation: z.string(),
  why: z.string().optional().default(""),
  action: z.string(),
  priority: z.enum(["Low", "Medium", "High", "Professional Follow-Up"]),
  timeframe: z.string().nullable().optional().default(null),
  basedOn: z.array(z.string()).default([]),
});

const inputShape = {
  healthData: z.array(z.record(z.string(), z.union([z.number(), z.string()]))).max(10),
  baseline: z.record(z.string(), z.number()),
  ranges: z.record(z.string(), z.array(z.number()).length(2)),
  context: z.string().max(900),
  answers: z.array(z.string().max(300)).max(3),
  scenario: z.string(),
};

export const generateInsight = createServerFn({ method: "POST" })
  .validator((input) => z.object({ ...inputShape, symptoms: z.array(z.string()).max(8) }).parse(input))
  .handler(async ({ data }) => {
    const raw = await askModel(
      'You are PulseIQ, a simulation-only health companion. Return ONLY compact valid JSON matching the requested schema. Use short strings, empty metricInsights and recommendations when appropriate, and never diagnose or claim causation. Mention urgent professional care only for urgent symptoms.',
      data,
      COMPANION_FALLBACK,
    );
    try {
      const parsed = z
        .object({
          status: z.enum(["stable", "attention", "follow-up", "urgent"]),
          headline: z.string(),
          dailySummary: z.string().default(""),
          metricInsights: z
            .array(z.object({ metric: z.string(), observation: z.string(), meaning: z.string() }))
            .default([]),
          response: z.string(),
          question: z.string().nullable().default(null),
          recommendations: z.array(recommendationSchema).default([]),
        })
        .parse(JSON.parse(raw));
      parsed.recommendations = parsed.recommendations.slice(0, 4);
      return { data: parsed };
    } catch {
      throw new Error("The AI returned an unexpected response. Please try again.");
    }
  });

export type CompanionResponse = {
  status: "stable" | "attention" | "follow-up" | "urgent";
  headline: string;
  dailySummary: string;
  metricInsights: Array<{ metric: string; observation: string; meaning: string }>;
  response: string;
  question: string | null;
  recommendations: Array<z.infer<typeof recommendationSchema>>;
};

const activitySchema = z.object({
  title: z.string(),
  mode: z.string(),
  duration: z.string(),
  intensity: z.string(),
  why: z.string(),
  exercises: z.array(z.string()).default([]),
  recoveryConsiderations: z.string(),
});
const changeSchema = z.object({
  metric: z.string(),
  current: z.string(),
  baseline: z.string(),
  change: z.string(),
  direction: z.enum(["up", "down", "stable"]),
  period: z.string(),
  interpretation: z.string(),
  basedOn: z.array(z.string()).default([]),
});
export type AIInsights = {
  recommendations: z.infer<typeof recommendationSchema>[];
  activity: z.infer<typeof activitySchema>;
  changes: z.infer<typeof changeSchema>[];
};

export const generateAIInsights = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({ ...inputShape, symptoms: z.array(z.object({ name: z.string(), severity: z.string() })).max(8) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const raw = await askModel(
      `You are PulseIQ's simulation-only recommendation engine. Return ONLY compact valid JSON matching the requested schema. Use short strings, 0-2 recommendations, and at most 2 changes. Never diagnose or claim causation; suggest professional follow-up for persistent concerning patterns.`,
      data,
      INSIGHTS_FALLBACK,
    );
    try {
      const parsed = JSON.parse(raw);
      return {
        data: {
          recommendations: z.array(recommendationSchema).parse(parsed.recommendations).slice(0, 4),
          activity: activitySchema.parse(parsed.activity),
          changes: z.array(changeSchema).parse(parsed.changes ?? []).slice(0, 10),
        } as AIInsights,
      };
    } catch {
      throw new Error("The AI returned an unexpected format. Please try generating the insights again.");
    }
  });
