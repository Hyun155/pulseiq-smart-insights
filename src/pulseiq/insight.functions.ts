import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

export const generateInsight = createServerFn({ method: 'POST' })
  .validator((input) => z.object({ symptoms: z.array(z.string()).max(8), context: z.string().max(500), answers: z.array(z.string().max(300)).max(3) }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error('AI is not configured. Your rule-based insight remains available.');
    const { createOpenAI } = await import('@ai-sdk/openai');
    const { streamText } = await import('ai');
    const { createLovableAiGatewayRunIdFetch } = await import('./run-id.server');
    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({ baseURL: 'https://ai.gateway.lovable.dev/v1', apiKey: key, headers: { 'Lovable-API-Key': key, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' }, fetch: runIdFetch.fetch });
    const result = streamText({ model: provider.responses('openai/gpt-6-astra'),
      instructions: 'You are PulseIQ, a simulation-only health pattern companion. Write one warm, concise paragraph (maximum 55 words) about the reported context alongside the measured pattern. Never diagnose, infer causes, override safety actions, or claim medical certainty. State that the user can consider speaking with a healthcare professional if symptoms persist. The simulated baseline is HR 62–67 BPM, sleep 7–8 h, steps 7,000–9,000; latest is HR 79, sleep 5.0 h, steps 3,600 over three days.',
      messages: [{ role: 'user', content: JSON.stringify(data) }],
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: 'low', reasoningSummary: 'auto', store: false, include: ['reasoning.encrypted_content'] } },
    });
    const text = (await result.text).trim();
    if (!text) throw new Error('The AI returned no insight. Your rule-based insight remains available.');
    return { text };
  });
