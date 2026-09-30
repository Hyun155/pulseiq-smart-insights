export type HealthLog = {
  type: "meal" | "activity" | "sleep";
  occurredAt: string;
  carbsGrams?: number;
  activityMinutes?: number;
  sleepHours?: number;
};

export type HealthMetricData = Record<string, number> & { logs?: HealthLog[] };

type Anomaly = {
  metric: string;
  value: number;
  average: number;
  changePercent: number;
  direction: "spike" | "drop";
  reason: string;
};

export type AIReadyHealthPayload = {
  requiresAIGeneration: true;
  reason: "multiple-anomalies" | "unknown-pattern";
  metrics: Array<Pick<Anomaly, "metric" | "value" | "average" | "changePercent" | "direction">>;
};

function likelyCause(metric: string, direction: Anomaly["direction"], logs: HealthLog[]): string {
  if (metric.toLowerCase() === "glucose" && direction === "spike" && logs.some((log) => log.type === "meal" && (log.carbsGrams ?? 0) >= 45)) {
    return "High carb intake detected in last 2 hours";
  }
  if (logs.some((log) => log.type === "sleep" && (log.sleepHours ?? 24) < 6)) {
    return "Low sleep duration";
  }
  if (logs.some((log) => log.type === "activity" && (log.activityMinutes ?? 0) >= 45)) {
    return "Recent activity detected";
  }
  return "No matching recent log";
}

export function evaluateHealthMetrics(
  currentData: HealthMetricData,
  historicalAverages: Record<string, number>,
): string | AIReadyHealthPayload {
  const logs = currentData.logs ?? [];
  const anomalies: Anomaly[] = [];
  for (const [metric, value] of Object.entries(currentData)) {
    if (metric === "logs" || typeof value !== "number") continue;
    const average = historicalAverages[metric];
    if (average === undefined || !Number.isFinite(average) || average === 0) continue;
    const changePercent = Math.round(((value - average) / Math.abs(average)) * 100);
    if (Math.abs(changePercent) > 20) {
      const direction = changePercent > 0 ? "spike" : "drop";
      anomalies.push({ metric, value, average, changePercent: Math.abs(changePercent), direction, reason: likelyCause(metric, direction, logs) });
    }
  }

  if (anomalies.length === 0) return "All monitored health metrics are within the configured 20% change threshold.";
  if (anomalies.length > 3 || anomalies.some((anomaly) => anomaly.reason === "No matching recent log")) {
    return {
      requiresAIGeneration: true,
      reason: anomalies.length > 3 ? "multiple-anomalies" : "unknown-pattern",
      metrics: anomalies.map(({ metric, value, average, changePercent, direction }) => ({ metric, value, average, changePercent, direction })),
    };
  }
  if (anomalies.length === 1) {
    const anomaly = anomalies[0]!;
    return `⚠️ ${anomaly.metric} ${anomaly.direction}d by ${anomaly.changePercent}%. Likely cause: ${anomaly.reason}`;
  }
  return anomalies.map((anomaly) => `⚠️ ${anomaly.metric} ${anomaly.direction}d by ${anomaly.changePercent}%. Likely cause: ${anomaly.reason}`).join("\n");
}
