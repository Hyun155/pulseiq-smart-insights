# PulseIQ backend modules

These modules are intentionally independent of the React simulation state.

## Medication reminders

1. Apply `schema.sql` to PostgreSQL.
2. Create a `Pool` with `DATABASE_URL`.
3. Implement `ChatPublisher.publish` for the application's chat transport.
4. Start `startMedicationReminderJob(createPostgresMedicationStore(pool), publisher)` from the Node worker entrypoint.

The cron expression is `* * * * *`. It queries active schedules whose date range and `HH:MM` reminder time match the local worker clock. `runMedicationReminderTick` is exported for deterministic tests.

## Health rules

Call `evaluateHealthMetrics(currentData, historicalAverages)` before any alert or explanation. It returns a rule-generated string for known patterns, or a privacy-safe `requiresAIGeneration: true` payload for multiple or unknown anomalies.

## Optional explanation

Only pass the escalation payload to `generateAIExplanation`. It uses Groq when `GROQ_API_KEY` is configured and returns a static safe response when the key is missing or the request fails.

## Recommendation matrix

`getRecommendations(["HIGH_GLUCOSE", "SEDENTARY"])` returns local diet and activity action cards. It makes no network calls.
