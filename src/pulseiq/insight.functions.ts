import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const generateInsight = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        healthData: z.array(z.record(z.string(), z.union([z.number(), z.string()]))).max(10),
        baseline: z.record(z.string(), z.number()),
        ranges: z.record(z.string(), z.array(z.number()).length(2)),
        symptoms: z.array(z.string()).max(8),
        context: z.string().max(900),
        answers: z.array(z.string().max(300)).max(3),
        scenario: z.string(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key)
      throw new Error(
        "Gemini AI is not configured. Add GEMINI_API_KEY to generate Companion responses.",
      );
    const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
    const { generateText } = await import("ai");
    const google = createGoogleGenerativeAI({ apiKey: key });
    const result = await generateText({
      model: google("gemini-3.8-flash"),
      instructions:
        'You are PulseIQ, a proactive simulation-only AI Health Companion. Analyze all supplied health data together and determine the appropriate interaction. Return ONLY valid JSON with this shape: {"status":"stable"|"attention"|"follow-up"|"urgent","headline":string,"response":string,"question":string|null,"recommendations":[{"title":string,"explanation":string,"action":string,"priority":"Low"|"Medium"|"High"|"Professional Follow-Up","timeframe":string|null,"basedOn":string[]}]}. The response must explain observations using the personal baseline, ask one useful question when context is missing, and prioritize professional or urgent care when appropriate. Never diagnose, claim causation, or give dangerous advice. If urgent, clearly tell the user to seek urgent medical care rather than continuing normally. Keep text warm and concise. Recommendations must be generated from the supplied context and may be empty when the pattern is stable.',
      messages: [{ role: "user", content: JSON.stringify(data) }],
    });
    const raw = result.text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "");
    try {
      const parsed = JSON.parse(raw);
      const response = z
        .object({
          status: z.enum(["stable", "attention", "follow-up", "urgent"]),
          headline: z.string(),
          response: z.string(),
          question: z.string().nullable(),
          recommendations: z.array(recommendationSchema).max(4),
        })
        .parse(parsed);
      return { data: response };
    } catch {
      throw new Error("Gemini returned an invalid Companion response. Please try again.");
    }
  });

const recommendationSchema = z.object({
  title: z.string(),
  explanation: z.string(),
  why: z.string(),
  action: z.string(),
  priority: z.enum(["Low", "Medium", "High", "Professional Follow-Up"]),
  timeframe: z.string().nullable(),
  basedOn: z.array(z.string()).max(8),
});
export type CompanionResponse = {
  status: "stable" | "attention" | "follow-up" | "urgent";
  headline: string;
  response: string;
  question: string | null;
  recommendations: Array<{
    title: string;
    explanation: string;
    action: string;
    priority: "Low" | "Medium" | "High" | "Professional Follow-Up";
    timeframe: string | null;
    basedOn: string[];
  }>;
};
const activitySchema = z.object({
  title: z.string(),
  mode: z.enum([
    "Rest",
    "Recovery",
    "Light activity",
    "Moderate exercise",
    "Normal activity",
    "Reduced exercise",
  ]),
  duration: z.string(),
  intensity: z.string(),
  why: z.string(),
  exercises: z.array(z.string()).max(6),
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
  basedOn: z.array(z.string()).max(6),
});
export type AIInsights = {
  recommendations: z.infer<typeof recommendationSchema>[];
  activity: z.infer<typeof activitySchema>;
  changes: z.infer<typeof changeSchema>[];
};

export const generateAIInsights = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        healthData: z.array(z.record(z.string(), z.union([z.number(), z.string()]))).max(10),
        baseline: z.record(z.string(), z.number()),
        ranges: z.record(z.string(), z.array(z.number()).length(2)),
        symptoms: z.array(z.object({ name: z.string(), severity: z.string() })).max(8),
        context: z.string().max(900),
        scenario: z.string(),
        answers: z.array(z.string()).max(3),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key)
      throw new Error(
        "Gemini AI is not configured. Add GEMINI_API_KEY to generate personalized recommendations.",
      );
    const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
    const { generateText } = await import("ai");
    const google = createGoogleGenerativeAI({ apiKey: key });
    const result = await generateText({
      model: google("gemini-3.8-flash"),
      instructions: `You are PulseIQ's health-pattern recommendation engine for a simulation-only app. Analyze the complete multi-day health context together, not isolated thresholds. Return ONLY valid JSON with this exact shape: {"recommendations":[{"title":string,"explanation":string,"why":string,"action":string,"priority":"Low"|"Medium"|"High"|"Professional Follow-Up","timeframe":string|null,"basedOn":string[]}],"activity":{"title":string,"mode":"Rest"|"Recovery"|"Light activity"|"Moderate exercise"|"Normal activity"|"Reduced exercise","duration":string,"intensity":string,"why":string,"exercises":string[],"recoveryConsiderations":string},"changes":[{"metric":string,"current":string,"baseline":string,"change":string,"direction":"up"|"down"|"stable","period":string,"interpretation":string,"basedOn":string[]}]}. Produce 2 to 4 recommendations, ordered by priority. Explain observations and uncertainty. Recommendations must be reasonable and non-extreme. Never diagnose, name a disease, claim causation, or make definitive medical conclusions. For potentially concerning combinations or persistent changes, recommend appropriate professional follow-up without alarmism. If data is stable, recommend monitoring and normal or gentle activity based on the combined context. All explanation and interpretation fields must be generated from the supplied data.`,
      messages: [{ role: "user", content: JSON.stringify(data) }],
    });
    const raw = result.text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "");
    try {
      const parsed = JSON.parse(raw);
      return {
        data: {
          recommendations: z
            .array(recommendationSchema)
            .min(2)
            .max(4)
            .parse(parsed.recommendations),
          activity: activitySchema.parse(parsed.activity),
          changes: z.array(changeSchema).max(10).parse(parsed.changes),
        },
      };
    } catch {
      throw new Error(
        "The AI returned an invalid insight format. Please try generating the insights again.",
      );
    }
  });
