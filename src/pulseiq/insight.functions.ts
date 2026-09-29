import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MODEL = "openai/gpt-6-astra";

async function askModel(instructions: string, payload: unknown): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured for this project yet.");
  const { createOpenAI } = await import("@ai-sdk/openai");
  const { streamText } = await import("ai");
  const { createLovableAiGatewayRunIdFetch } = await import("./run-id.server");
  const runId = createLovableAiGatewayRunIdFetch();
  const openai = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runId.fetch as typeof fetch,
  });
  let streamError: unknown = null;
  const result = streamText({
    onError: ({ error }: { error: unknown }) => { streamError = error; },
    model: openai.responses(MODEL),
    instructions,
    messages: [{ role: "user", content: JSON.stringify(payload) }],
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  } as Parameters<typeof streamText>[0]);
  let text: string;
  try {
    text = await result.text;
  } catch (e) {
    // Read the real HTTP status (the error may be wrapped in `cause`/`lastError`).
    const err = (streamError ?? e) as { statusCode?: number; cause?: { statusCode?: number }; lastError?: { statusCode?: number }; message?: string };
    const status = err?.statusCode ?? err?.cause?.statusCode ?? err?.lastError?.statusCode;
    const msg = err?.message ?? String(e);
    console.error("[PulseIQ AI]", status, msg);
    if (status === 402 || /\b402\b|payment required|insufficient credits/i.test(msg))
      throw new Error("AI credits have run out. Add credits in your workspace settings to use AI analysis — the rule-based insights still work.");
    if (status === 403) throw new Error("AI access is currently blocked for this workspace.");
    if (status === 429 || /\b429\b|rate limit/i.test(msg))
      throw new Error("The AI is busy right now. Please try again in a moment.");
    throw new Error("The AI could not complete the analysis. Please try again.");
  }
  return text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
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
      'You are PulseIQ, a proactive simulation-only AI Health Companion. The LAST item in healthData is TODAY. Return ONLY valid JSON: {"status":"stable"|"attention"|"follow-up"|"urgent","headline":string,"dailySummary":string,"metricInsights":[{"metric":string,"observation":string,"meaning":string}],"response":string,"question":string|null,"recommendations":[{"title":string,"explanation":string,"action":string,"priority":"Low"|"Medium"|"High"|"Professional Follow-Up","timeframe":string|null,"basedOn":string[]}]}. dailySummary: 2-3 sentences stating whether today looks healthy overall compared with the personal baseline and ranges. metricInsights: one entry per notable metric today (heart rate, HRV, sleep, steps, SpO2, respiratory rate, recovery), saying the value vs usual and what a spike or drop commonly occurs alongside (e.g. short sleep, stress, strain) — use "often appears alongside", never claim causation. response: warm, concise explanation of the multi-day pattern. Ask one useful question when context is missing. Never diagnose or name diseases. If urgent symptoms are reported, tell the user to seek urgent medical care. 0-4 recommendations.',
      data,
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
      `You are PulseIQ's health-pattern recommendation engine for a simulation-only app. Analyze the complete multi-day health context together. Return ONLY valid JSON: {"recommendations":[{"title":string,"explanation":string,"why":string,"action":string,"priority":"Low"|"Medium"|"High"|"Professional Follow-Up","timeframe":string|null,"basedOn":string[]}],"activity":{"title":string,"mode":"Rest"|"Recovery"|"Light activity"|"Moderate exercise"|"Normal activity"|"Reduced exercise","duration":string,"intensity":string,"why":string,"exercises":string[],"recoveryConsiderations":string},"changes":[{"metric":string,"current":string,"baseline":string,"change":string,"direction":"up"|"down"|"stable","period":string,"interpretation":string,"basedOn":string[]}]}. Produce 2 to 4 recommendations ordered by priority, and up to 7 changes. Never diagnose, name a disease or claim causation. For persistent changes recommend professional follow-up without alarmism.`,
      data,
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
