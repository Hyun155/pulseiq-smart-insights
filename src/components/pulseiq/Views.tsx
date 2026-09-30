import { planActivity } from "@/pulseiq/activity";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  Heart,
  HeartPulse,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePulse } from "@/pulseiq/store";
import {
  actionLevel,
  analyzeToday,
  baseline,
  detect,
  ranges,
  activeMedications,
  todayISO,
  type Level,
  type Measurement,
} from "@/pulseiq/engine";
import {
  generateAIInsights,
  generateInsight,
  type AIInsights,
  type CompanionResponse,
} from "@/pulseiq/insight.functions";
import wearable from "@/assets/pulseiq-wearable.jpg";
import { buildReport } from "@/pulseiq/report";

const levelCopy: Record<
  Level,
  { name: string; title: string; description: string; action: string }
> = {
  green: {
    name: "Monitoring",
    title: "Your pattern looks steady.",
    description:
      "Your recent measurements are within your usual pattern. We’ll keep an eye on it together.",
    action: "Continue monitoring",
  },
  yellow: {
    name: "Recheck",
    title: "Something has shifted.",
    description: "We've detected a meaningful change from your usual health pattern.",
    action: "Complete your check-in",
  },
  orange: {
    name: "Follow up",
    title: "Let’s take a closer look.",
    description:
      "The pattern has persisted alongside what you reported. Consider discussing these changes with a healthcare professional.",
    action: "Review your next steps",
  },
  red: {
    name: "High concern",
    title: "Please seek support.",
    description:
      "This simulated pattern calls for prompt attention. If you have severe or concerning symptoms, seek urgent medical care.",
    action: "Review support options",
  },
};
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}
function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="page-heading">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}
function LevelTag({ level }: { level: Level }) {
  return (
    <span className={`level-tag level-${level}`}>
      <span className="status-dot" />
      {levelCopy[level].name}
    </span>
  );
}
function FormatPercent({ value }: { value: number }) {
  return (
    <span className={value > 0 ? "delta-up" : "delta-down"}>
      {value > 0 ? "+" : ""}
      {value}%
    </span>
  );
}
function Measurements() {
  const { state } = usePulse();
  const { latest, deviation } = detect(state.measurements);
  const cards = [
    {
      title: "Resting heart rate",
      value: latest.hr,
      unit: "BPM",
      range: "62–67 BPM",
      deviation: deviation.hr,
      icon: HeartPulse,
      kind: "heart",
    },
    {
      title: "Sleep duration",
      value: latest.sleep.toFixed(1),
      unit: "hours",
      range: "7–8 hours",
      deviation: deviation.sleep,
      icon: Clock3,
      kind: "sleep",
    },
    {
      title: "Daily activity",
      value: latest.steps.toLocaleString(),
      unit: "steps",
      range: "7,000–9,000",
      deviation: deviation.steps,
      icon: Activity,
      kind: "activity",
    },
  ];
  return (
    <div className="metric-grid">
      {cards.map((c) => (
        <div className="metric-card" key={c.title}>
          <div className="metric-top">
            <span className={`metric-icon ${c.kind}`}>
              <c.icon size={19} strokeWidth={1.8} />
            </span>
            <span
              className={`metric-delta ${state.scenario === "stable" || state.scenario === "improved" ? "muted-delta" : ""}`}
            >
              {state.scenario === "stable" ? "In range" : <FormatPercent value={c.deviation} />}
            </span>
          </div>
          <div className="metric-label">{c.title}</div>
          <div className="metric-value">
            {c.value}
            <small>{c.unit}</small>
          </div>
          <div className="metric-footer">
            Your usual: <strong>{c.range}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}
function TrendChart() {
  const { state } = usePulse();
  const days = state.measurements.slice(-7);
  const width = 700;
  const height = 175;
  const x = (i: number) => 22 + (i * (width - 44)) / Math.max(days.length - 1, 1);
  const y = (hr: number) => height - 20 - ((hr - 55) / 40) * (height - 38);
  const line = days.map((d, i) => `${i ? "L" : "M"} ${x(i)} ${y(d.hr)}`).join(" ");
  return (
    <div className="trend-card">
      <div className="section-header">
        <div>
          <Eyebrow>YOUR PATTERN</Eyebrow>
          <h2>Resting heart rate</h2>
          <p>Compared to your personal baseline</p>
        </div>
        <span className="chart-legend">
          <i /> Your resting HR <em /> Usual range
        </span>
      </div>
      <div className="chart-wrap">
        <div className="chart-y">
          <span>90</span>
          <span>80</span>
          <span>70</span>
          <span>60</span>
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Resting heart rate trend"
        >
          <rect
            className="chart-band"
            x="0"
            y={y(67)}
            width={width}
            height={y(62) - y(67)}
            rx="4"
          />
          <path
            className="chart-grid"
            d={`M 0 ${y(80)} H ${width} M 0 ${y(70)} H ${width} M 0 ${y(60)} H ${width}`}
          />
          <path className="chart-line" d={line} />
          {days.map((d, i) => (
            <circle className="chart-point" key={i} cx={x(i)} cy={y(d.hr)} r="5" />
          ))}
        </svg>
      </div>
      <div className="chart-labels">
        {days.map((d, i) => (
          <span key={i}>{d.day}</span>
        ))}
      </div>
    </div>
  );
}
function NextStep() {
  const { state } = usePulse();
  const level = actionLevel(state);
  return (
    <div className="next-step">
      <span className="next-icon">
        <Zap size={20} />
      </span>
      <div>
        <Eyebrow>NEXT BEST STEP</Eyebrow>
        <h3>
          {level === "green"
            ? "Keep listening to your body"
            : level === "yellow" && state.step < 3
              ? "Tell us how you feel"
              : level === "red"
                ? "Seek timely help"
                : "Check in again"}
        </h3>
        <p>
          {level === "green"
            ? "We’re here when your pattern changes."
            : level === "yellow" && state.step < 3
              ? "A short conversation helps put these changes in context."
              : level === "red"
                ? "If symptoms feel severe or sudden, contact urgent care."
                : "See whether the pattern moves closer to your usual range."}
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to={level === "yellow" && state.step < 3 ? "/companion" : "/insights"}>
          View <ArrowRight size={16} />
        </Link>
      </Button>
    </div>
  );
}
export function Overview() {
  const { state, run } = usePulse();
  const level = actionLevel(state);
  const insight = detect(state.measurements);
  return (
    <>
      <div className="welcome-row">
        <div>
          <Eyebrow>PERSONAL HEALTH INTELLIGENCE</Eyebrow>
          <h1>
            Good morning, Alex <span className="wave">✳</span>
          </h1>
          <p>Here’s what your health pattern is telling us today.</p>
        </div>
        <div className="today-label">
          <span className="today-icon">
            <Activity size={17} />
          </span>{" "}
          SIMULATED HEALTH DATA
        </div>
      </div>
      <div
        className={`hero-panel hero-${level}`}
        style={{
          backgroundImage: `linear-gradient(90deg, var(--hero-overlay) 0%, var(--hero-overlay) 48%, transparent 100%), url(${wearable})`,
        }}
      >
        <div className="hero-content">
          <div className="hero-top">
            <span className="hero-kicker">
              <span className="pulse-indicator" /> YOUR CURRENT STATUS
            </span>
            <LevelTag level={level} />
          </div>
          <h2>{levelCopy[level].title}</h2>
          <p>{levelCopy[level].description}</p>
          <div className="hero-bottom">
            <Button asChild>
              <Link
                to={
                  level === "green"
                    ? "/insights"
                    : level === "yellow" && state.step < 3
                      ? "/companion"
                      : "/insights"
                }
              >
                {levelCopy[level].action}
                <ArrowRight size={17} />
              </Link>
            </Button>
            <span>
              {level === "green"
                ? "Based on your personal baseline"
                : `${insight.duration} days · ${insight.signalCount} signals changed`}
            </span>
          </div>
        </div>
      </div>
      <div className="section-title-row">
        <div>
          <Eyebrow>AT A GLANCE</Eyebrow>
          <h2>Your health signals</h2>
        </div>
        <span>Today vs. your usual</span>
      </div>
      <Measurements />
      <div className="overview-lower">
        <TrendChart />
        <div className="right-stack">
          <div className="insight-teaser">
            <div className="teaser-icon">
              <Sparkles size={21} />
            </div>
            <Eyebrow>PULSEIQ INSIGHT</Eyebrow>
            <h3>
              {level === "green" ? "The little things add up." : "Several signals moved together."}
            </h3>
            <p>
              {level === "green"
                ? "Your heart rate, sleep, and activity are in line with your personal pattern. That’s worth knowing."
                : "Your resting heart rate rose while sleep and activity fell. This pattern has continued for three days."}
            </p>
            <Link to="/insights" className="text-link">
              Explore insight <ArrowRight size={16} />
            </Link>
          </div>
          <NextStep />
        </div>
      </div>
    </>
  );
}
export function Insights() {
  const { state, run } = usePulse();
  const data = detect(state.measurements);
  const level = actionLevel(state);
  const changed = state.scenario !== "stable";
  return (
    <>
      <PageHeading
        eyebrow="THE BIG PICTURE"
        title="Health insights"
        description="Understand what changed, how long it lasted, and what comes next."
      />
      <div className="insight-layout">
        <div className="insight-main">
          <div className="insight-summary">
            <div className="insight-summary-head">
              <span className={`summary-symbol level-${level}`}>
                <Activity size={24} />
              </span>
              <LevelTag level={level} />
            </div>
            <h2>
              {changed
                ? state.scenario === "improved"
                  ? "Moving toward your usual pattern"
                  : "Meaningful change detected"
                : "No meaningful change detected"}
            </h2>
            <p>
              {changed
                ? state.scenario === "improved"
                  ? "Your recent measurements are moving closer to your usual pattern."
                  : "We've detected a meaningful change from your usual health pattern."
                : "Your recent measurements are within your usual pattern. Continue monitoring."}
            </p>
            {changed && (
              <div className="insight-facts">
                <div>
                  <strong>{data.signalCount}</strong>
                  <span>signals changed</span>
                </div>
                <div>
                  <strong>{data.duration}</strong>
                  <span>consecutive days</span>
                </div>
                <div>
                  <strong>{data.trend ? "↑" : "—"}</strong>
                  <span>heart rate trend</span>
                </div>
              </div>
            )}
          </div>
          {changed && (
            <div className="evidence-section">
              <div className="section-header">
                <div>
                  <Eyebrow>OBSERVED PATTERN</Eyebrow>
                  <h2>What changed</h2>
                </div>
              </div>
              <div className="evidence-row">
                <div className="evidence-icon heart">
                  <HeartPulse size={19} />
                </div>
                <div>
                  <strong>Resting heart rate</strong>
                  <span>Your usual 62–67 BPM</span>
                </div>
                <b>{data.latest.hr} BPM</b>
                <ArrowUpRight className="delta-up" size={19} />
              </div>
              <div className="evidence-row">
                <div className="evidence-icon sleep">
                  <Clock3 size={19} />
                </div>
                <div>
                  <strong>Sleep duration</strong>
                  <span>Your usual 7–8 hours</span>
                </div>
                <b>{data.latest.sleep.toFixed(1)} hours</b>
                <ArrowDownRight className="delta-down" size={19} />
              </div>
              <div className="evidence-row">
                <div className="evidence-icon activity">
                  <Activity size={19} />
                </div>
                <div>
                  <strong>Daily activity</strong>
                  <span>Your usual 7,000–9,000 steps</span>
                </div>
                <b>{data.latest.steps.toLocaleString()} steps</b>
                <ArrowDownRight className="delta-down" size={19} />
              </div>
            </div>
          )}
          <div className="context-section">
            <Eyebrow>PUTTING IT TOGETHER</Eyebrow>
            <h2>{changed ? "Why we’re highlighting this" : "What this means"}</h2>
            <p>
              {changed
                ? `Several measurements moved away from your usual pattern at the same time${state.symptoms.length ? `, alongside reported ${state.symptoms.map((s) => s.name).join(" and ")}` : ""}. This describes a change, not its cause.`
                : "PulseIQ compares measurements with your own baseline rather than a one-size-fits-all threshold."}
            </p>
            {state.symptoms.length > 0 && (
              <div className="chips">
                {state.symptoms.map((s) => (
                  <span className="chip" key={s.name}>
                    {s.name} · {s.severity}
                  </span>
                ))}
              </div>
            )}
            {(state.medication || state.cycle || state.notes) && (
              <p className="context-note">
                Additional context:{" "}
                {[state.medication, state.cycle, state.notes].filter(Boolean).join(" · ")}. These
                occurred alongside the pattern; they do not explain its cause.
              </p>
            )}
          </div>
        </div>
        <aside className="insight-side">
          <div className="action-panel">
            <div className="action-panel-icon">
              <Heart size={21} />
            </div>
            <Eyebrow>RECOMMENDED ACTION</Eyebrow>
            <h3>{levelCopy[level].name}</h3>
            <p>
              {level === "green"
                ? levelCopy.green.description
                : level === "yellow"
                  ? levelCopy.yellow.action + ". Then check again after the next measurement cycle."
                  : levelCopy[level].description}
            </p>
            {changed && state.step < 3 && (
              <Button asChild className="w-full">
                <Link to="/companion">
                  Complete check-in <ArrowRight size={16} />
                </Link>
              </Button>
            )}
            {changed && (
              <div className="recheck-box">
                <Clock3 size={18} />
                <div>
                  <strong>
                    {state.recheck === "complete" ? "Recheck complete" : "Follow-up planned"}
                  </strong>
                  <span>
                    {state.recheck === "complete"
                      ? "Your latest measurement has been reviewed."
                      : "We’ll compare the next measurement cycle."}
                  </span>
                </div>
              </div>
            )}
          </div>
          {changed && (
            <div className="recheck-options">
              <Eyebrow>SIMULATE RECHECK</Eyebrow>
              <p>See how the next measurement changes the guidance.</p>
              <Button variant="outline" onClick={() => run("improved")}>
                Improved <ChevronRight size={16} />
              </Button>
              <Button variant="outline" onClick={() => run("persistent")}>
                Still persistent <ChevronRight size={16} />
              </Button>
              <Button variant="outline" onClick={() => run("worsening")}>
                Worsening <ChevronRight size={16} />
              </Button>
            </div>
          )}
          <p className="medical-note">
            <CircleAlert size={16} /> PulseIQ identifies changes in your personal pattern. It does
            not provide a medical diagnosis.
          </p>
        </aside>
      </div>
    </>
  );
}
export function AIInsightsPage() {
  const { state } = usePulse();
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [loading, setLoading] = useState(false);
  const data = detect(state.measurements);
  const rulePlan = planActivity(data.latest, state.symptoms.map((s) => s.name));
  const activity = { ...rulePlan, ...(insights?.activity ?? {}), diet: rulePlan.diet };
  const generate = async () => {
    setLoading(true);
    try {
      const result = await generateAIInsights({
        data: {
          healthData: state.measurements.slice(-7),
          baseline,
          ranges,
          symptoms: state.symptoms,
          context: [state.medication, state.cycle, state.notes].filter(Boolean).join("; "),
          scenario: state.scenario,
          answers: state.messages
            .filter((message) => message.role === "user")
            .map((message) => message.text),
        },
      });
      setInsights(result.data);
    } catch {
      // Silently keep the personalized plan built from your readings.
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="AI HEALTH GUIDANCE"
        title="Health insights"
        description="Understand what the AI sees in your complete health pattern and what you might do next."
      />
      <div className="ai-insights-toolbar">
        <div>
          <span className="ai-spark">
            <Sparkles size={17} />
          </span>
          <div>
            <strong>AI-generated based on your recent health data</strong>
            <span>Uses your trends, personal baseline, context, and check-in responses.</span>
          </div>
        </div>
        <Button onClick={generate} disabled={loading}>
          <Sparkles size={16} />
          {loading
            ? "Analyzing your pattern..."
            : insights
              ? "Refresh AI insights"
              : "Generate AI insights"}
        </Button>
      </div>
      {loading && (
        <p className="ai-loading-note">
          <Sparkles size={14} /> Refreshing your plan...
        </p>
      )}
      {(
        <>
          <section className="ai-section activity-recommendation">
            <div className="ai-section-heading">
              <div>
                <Eyebrow>AI PERSONALIZED ACTIVITY</Eyebrow>
                <h2>What should you do today?</h2>
                <p>The AI can recommend rest when recovery is more appropriate than exercise.</p>
              </div>
              <span className="ai-badge">
                <Sparkles size={13} /> AI-generated
              </span>
            </div>
            <div className="activity-recommendation-body">
              <div className="activity-callout">
                <span>RECOMMENDED TODAY</span>
                <h3>{activity.title}</h3>
                <strong>
                  {activity.duration} · {activity.intensity}
                </strong>
                <p>{activity.why}</p>
                <Button variant="outline" onClick={() => setShowActivity((v) => !v)}>
                  <ArrowRight size={16} />{" "}
                  {showActivity ? "Hide suggested activity" : "View suggested activity"}
                </Button>
                {showActivity && (
                  <div className="activity-details" style={{ marginTop: "1rem" }}>
                    <div>
                      <strong>Your suggested plan for today</strong>
                      <span>
                        {activity.title} — {activity.duration},{" "}
                        {activity.intensity} intensity ({activity.mode})
                      </span>
                    </div>
                    <div>
                      <strong>Suggested diet today</strong>
                      <ul style={{ paddingLeft: "1.2rem", margin: 0 }}>
                        {activity.diet.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    </div>
                    {activity.exercises.length > 0 ? (
                      <div>
                        <strong>Steps to follow</strong>
                        <ol style={{ paddingLeft: "1.2rem", margin: 0 }}>
                          {activity.exercises.map((ex) => (
                            <li key={ex}>{ex}</li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <div>
                        <strong>Steps to follow</strong>
                        <span>Focus on rest and gentle recovery today.</span>
                      </div>
                    )}
                    <div>
                      <strong>Keep in mind</strong>
                      <span>{activity.recoveryConsiderations}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="activity-details">
                <div>
                  <strong>Mode</strong>
                  <span>{activity.mode}</span>
                </div>
                <div>
                  <strong>Recovery considerations</strong>
                  <span>{activity.recoveryConsiderations}</span>
                </div>
                {activity.exercises.length > 0 && (
                  <div>
                    <strong>Suggested exercises</strong>
                    <span>{activity.exercises.join(" · ")}</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
export function Companion() {
  const { state, answer, run, markTaken } = usePulse();
  const dueMeds = activeMedications(state.medications);
  const [input, setInput] = useState("");
  const [companion, setCompanion] = useState<CompanionResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const active = state.scenario !== "stable" || Boolean(companion);
  const observed = detect(state.measurements);
  const today = analyzeToday(observed.latest);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    answer(input);
    setInput("");
    setCompanion(null);
    setError("");
  };
  const getInsight = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await generateInsight({
        data: {
          healthData: state.measurements.slice(-7),
          baseline,
          ranges,
          symptoms: state.symptoms.map((s) => s.name),
          context: [state.medication, state.cycle, state.notes].filter(Boolean).join("; "),
          answers: state.messages.filter((m) => m.role === "user").map((m) => m.text),
          scenario: state.scenario,
        },
      });
      setCompanion(result.data);
      try { sessionStorage.setItem("pulseiq-companion", JSON.stringify(result.data)); } catch { /* ignore */ }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "AI is unavailable. Your rule-based insight remains available.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void getInsight();
  }, [state.scenario, state.step, state.symptoms.length]);
  return (
    <>
      <PageHeading
        eyebrow="PROACTIVE DAILY HEALTH SUPPORT"
        title="AI Health Companion"
        description="Your AI-powered daily health companion is already paying attention to your pattern."
      />
      <div className="companion-layout">
        <div className="chat-panel">
          <div className="chat-header">
            <div className="chat-avatar">
              <Sparkles size={20} />
            </div>
            <div>
              <strong>PulseIQ Companion</strong>
              <span>
                {active
                  ? loading
                    ? "Analyzing your health data"
                    : "Here with you"
                  : "Quietly monitoring your usual pattern"}
              </span>
            </div>
            <span className="chat-live">
              <span /> {active ? "ACTIVE COMPANION" : "DAILY MONITORING"}
            </span>
            {companion && (
              <span className={`companion-status status-${companion.status}`}>
                <span />{" "}
                {companion.status === "follow-up"
                  ? "FOLLOW-UP RECOMMENDED"
                  : companion.status.toUpperCase()}
              </span>
            )}
          </div>
          <div className="chat-body">
            {dueMeds.length > 0 && (
              <div className="med-reminder" role="status">
                <Eyebrow>MEDICATION REMINDER</Eyebrow>
                <p>Here's your medication plan for today. Please take it as prescribed.</p>
                <ul>
                  {dueMeds.map((m) => {
                    const taken = m.takenOn.includes(todayISO());
                    return (
                      <li key={m.id}>
                        <span><strong>{m.name}</strong> {m.dose} · {m.time}</span>
                        {taken ? <span className="med-taken"><Check size={14} /> Taken</span> : <Button size="sm" variant="outline" onClick={() => markTaken(m.id)}>Mark as taken</Button>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <div className="today-analysis">
              <div className="today-analysis-head">
                <Eyebrow>TODAY'S HEALTH SUMMARY · {today.healthy ? "HEALTHY" : "CHANGES NOTED"}</Eyebrow>
                <strong>{today.overall}</strong>
                {companion?.dailySummary ? <p>{companion.dailySummary}</p> : loading ? <p>AI is analyzing today's data…</p> : error ? <p className="form-error" role="alert">{error}</p> : null}
              </div>
              <ul>
                {today.metrics.map((m) => {
                  const ai = companion?.metricInsights.find((x) => { const t = x.metric.toLowerCase(); return ({ hr: /resting heart|heart rate$|^heart rate/.test(t) && !/variab|hrv/.test(t), hrv: /hrv|variab/.test(t), sleep: /sleep/.test(t), steps: /step|activity/.test(t), spo2: /spo|oxygen/.test(t), respiratoryRate: /resp|breath/.test(t), recovery: /recover/.test(t) } as Record<string, boolean>)[m.key]; });
                  return (
                    <li key={m.key} className={`metric-row metric-${m.status}`}>
                      <span className="metric-row-label">{m.label}</span>
                      <span className="metric-row-value">{m.value} <small>usual {m.usual}</small></span>
                      <span className="metric-row-badge">{m.status === "normal" ? "Normal" : m.status === "high" ? "Above usual" : "Below usual"}</span>
                      {m.status !== "normal" && <span className="metric-row-meaning">{ai?.meaning || m.meaning}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
            {!active ? (
              <div className="chat-empty">
                <div className="empty-mark">
                  <MessageCircle size={30} />
                </div>
                <h2>{companion?.headline ?? "Here when it matters."}</h2>
                <p>
                  {companion?.response ||
                    "The AI Companion is reviewing your recent health data and personal baseline."}
                </p>
                {!companion && (
                  <Button onClick={() => run("change")}>
                    <Zap size={16} /> Run simulation
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="chat-day">TODAY'S AI HEALTH ANALYSIS</div>
                {state.messages
                  .filter((m) => m.role === "user")
                  .map((m, i) => (
                    <div key={i} className={`chat-message ${m.role}`}>
                      <div className="bubble-avatar">
                        {m.role === "assistant" ? <Sparkles size={15} /> : "AM"}
                      </div>
                      <div className="bubble">{m.text}</div>
                    </div>
                  ))}
                {companion && (
                  <div className="chat-message assistant">
                    <div className="bubble-avatar">
                      <Sparkles size={15} />
                    </div>
                    <div className="bubble">
                      <strong>{companion.headline}</strong>
                      <br />
                      {companion.response}
                      {companion.question && (
                        <>
                          <br />
                          <br />
                          <strong>{companion.question}</strong>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          {active && state.step < 3 && companion?.status !== "urgent" ? (
            <form className="chat-input" onSubmit={submit}>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Write a response..."
                aria-label="Your response to the AI Companion"
                maxLength={300}
              />
              <Button type="submit" size="icon" aria-label="Send response" disabled={!input.trim()}>
                <Send size={17} />
              </Button>
            </form>
          ) : (
            <div className="chat-input chat-input-disabled">
              <span>
                {active
                  ? "The AI has reviewed your latest response"
                  : "The companion is monitoring for meaningful changes."}
              </span>
              <MessageCircle size={18} />
            </div>
          )}
        </div>
        <aside className="companion-side">
          <div className="companion-context">
            <Eyebrow>AI COMPANION CONTEXT</Eyebrow>
            <h3>What we know so far</h3>
            <div className="context-line">
              <span className="context-icon">
                <Activity size={16} />
              </span>
              <div>
                <strong>Health pattern</strong>
                <small>
                  {observed.signalCount} signals changed · {observed.duration} days observed
                </small>
              </div>
              <Check size={16} />
            </div>
            <div className="context-line">
              <span className="context-icon">
                <MessageCircle size={16} />
              </span>
              <div>
                <strong>Conversation</strong>
                <small>
                  {active
                    ? `${state.messages.filter((m) => m.role === "user").length} user responses`
                    : "No action needed right now"}
                </small>
              </div>
            </div>
            <div className="context-line">
              <span className="context-icon">
                <Heart size={16} />
              </span>
              <div>
                <strong>Reported symptoms</strong>
                <small>
                  {state.symptoms.length
                    ? state.symptoms.map((s) => s.name).join(", ")
                    : "None reported"}
                </small>
              </div>
            </div>
          </div>
          {active && companion && (
            <div className="ai-summary">
              <Eyebrow>AI ASSESSMENT · {companion.status.replace("-", " ")}</Eyebrow>
              <p>{companion.response}</p>
              {companion.recommendations.length > 0 && (
                <div className="companion-recommendations">
                  <strong>AI Top Recommendations</strong>
                  {companion.recommendations.map((recommendation) => (
                    <div className="companion-recommendation" key={recommendation.title}>
                      <b>{recommendation.title}</b>
                      <span>{recommendation.explanation}</span>
                      <small>Based on: {recommendation.basedOn.join(" · ")}</small>
                      <small>
                        {recommendation.action} · Priority: {recommendation.priority}
                      </small>
                      {recommendation.timeframe && (
                        <small>Timeframe: {recommendation.timeframe}</small>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {active && (
                <Button
                  variant="outline"
                  onClick={getInsight}
                  disabled={loading}
                  className="w-full"
                >
                  <Sparkles size={16} />
                  {loading ? "Reflecting..." : "Refresh AI assessment"}
                </Button>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
            </div>
          )}
          <p className="medical-note">
            <CircleAlert size={16} /> This AI Companion describes simulated health patterns, not a
            medical diagnosis. Seek professional care for concerning symptoms.
          </p>
        </aside>
      </div>
    </>
  );
}
export function Timeline() {
  const { state } = usePulse();
  return (
    <>
      <PageHeading
        eyebrow="THE STORY OVER TIME"
        title="Health timeline"
        description="Every observation and next step, in one clear sequence."
      />
      <HealthSummaryPanel />
      <div className="timeline-layout">
        <div className="timeline-list">
          {[...state.events].reverse().map((e, i) => (
            <div className="timeline-item" key={e.id}>
              <div className={`timeline-symbol kind-${e.kind}`}>
                {e.kind === "support" ? (
                  <ShieldCheck size={19} />
                ) : e.kind === "conversation" ? (
                  <MessageCircle size={19} />
                ) : e.kind === "change" ? (
                  <Zap size={19} />
                ) : e.kind === "action" ? (
                  <CheckCircle2 size={19} />
                ) : (
                  <Activity size={19} />
                )}
              </div>
              <div className="timeline-content">
                <span>
                  {i === 0 ? "LATEST EVENT" : "SIMULATED EVENT " + (state.events.length - i)}
                </span>
                <h3>{e.label}</h3>
                <p>{e.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
function MedicationPlan() {
  const { state, addMedication, removeMedication } = usePulse();
  const t = todayISO();
  const [f, setF] = useState({ name: "", dose: "", time: "08:00", start: t, end: t });
  const [err, setErr] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return setErr("Enter a medication name.");
    if (f.end < f.start) return setErr("End date must be on or after the start date.");
    setErr("");
    addMedication({ ...f, name: f.name.trim(), dose: f.dose.trim() });
    setF({ ...f, name: "", dose: "" });
  };
  return (
    <div className="profile-section">
      <Eyebrow>MEDICATION SIMULATION</Eyebrow>
      <h2>Medication intake plan</h2>
      <p>Add a medication for a period. The AI Companion will remind you each day it is active.</p>
      <form onSubmit={submit} className="med-form">
        <label className="field-label">Medication name<Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={60} placeholder="e.g. Vitamin D" /></label>
        <label className="field-label">Dose<Input value={f.dose} onChange={(e) => setF({ ...f, dose: e.target.value })} maxLength={30} placeholder="e.g. 1 tablet" /></label>
        <label className="field-label">Time<Input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></label>
        <label className="field-label">Start date<Input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></label>
        <label className="field-label">End date<Input type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></label>
        {err && <small className="field-error">{err}</small>}
        <Button type="submit">Submit medication</Button>
      </form>
      {state.medications.length > 0 && (
        <ul className="med-list">
          {state.medications.map((m) => (
            <li key={m.id}>
              <span><strong>{m.name}</strong> {m.dose} · {m.time} · {m.start} → {m.end}</span>
              <Button size="sm" variant="ghost" onClick={() => removeMedication(m.id)}>Remove</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export function Profile() {
  return (
    <>
      <PageHeading
        eyebrow="YOUR STARTING POINT"
        title="Health profile"
        description="Your personal baseline is the reference point for every insight."
      />
      <div className="profile-banner">
        <div className="avatar avatar-large">AM</div>
        <div>
          <h2>Alex Morgan</h2>
          <p>Fictional demonstration profile · 7-day baseline</p>
        </div>
        <span className="profile-badge">
          <CheckCircle2 size={16} /> Baseline established
        </span>
      </div>
      <div className="profile-grid">
        <div className="profile-section">
          <Eyebrow>YOUR USUAL RANGES</Eyebrow>
          <h2>Personal baseline</h2>
          <p>Calculated from seven simulated days, then compared with each new measurement.</p>
          <div className="baseline-row">
            <HeartPulse size={20} />
            <span>Resting heart rate</span>
            <strong>
              {ranges.hr[0]}–{ranges.hr[1]} BPM
            </strong>
          </div>
          <div className="baseline-row">
            <Clock3 size={20} />
            <span>Sleep duration</span>
            <strong>
              {ranges.sleep[0]}–{ranges.sleep[1]} hours
            </strong>
          </div>
          <div className="baseline-row">
            <Activity size={20} />
            <span>Daily activity</span>
            <strong>
              {ranges.steps[0].toLocaleString()}–{ranges.steps[1].toLocaleString()} steps
            </strong>
          </div>
          <div className="baseline-average">
            Calculated averages: {Math.round(baseline.hr)} BPM · {baseline.sleep.toFixed(1)} hours ·{" "}
            {Math.round(baseline.steps).toLocaleString()} steps
          </div>
        </div>
        <MedicationPlan />
      </div>
    </>
  );
}
export function Support() {
  const { state, updateContact, notify, saveContact } = usePulse();
  const [phoneError, setPhoneError] = useState("");
  const level = actionLevel(state);
  const submitContact = (e: FormEvent) => {
    e.preventDefault();
    if (!state.contact.name.trim()) return setPhoneError("Enter the trusted person's name.");
    if (!/^\+?[0-9\s-]{7,16}$/.test(state.contact.phone.trim())) return setPhoneError("Enter a valid phone number (7–15 digits).");
    setPhoneError("");
    saveContact();
  };
  if (state.role !== "elderly")
    return (
      <>
        <PageHeading eyebrow="HUMAN CONNECTION" title="Trusted support" description="Trusted support is available in Elderly mode." />
        <p>Switch to Elderly mode from the sidebar to set up a trusted person.</p>
      </>
    );
  const canNotify = state.contact.saved && (
    (level === "orange" && state.scenario === "persistent" && state.contact.persistent) ||
    (level === "red" && state.contact.highConcern));
  return (
    <>
      <PageHeading
        eyebrow="HUMAN CONNECTION"
        title="Trusted support"
        description="A person you trust, brought in only when you choose."
      />
      <div className="support-layout">
        <form className="support-form" onSubmit={submitContact}>
          <div className="support-intro">
            <div className="support-icon">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2>Your trusted person</h2>
              <p>Configure one fictional contact for this simulation.</p>
            </div>
          </div>
          <div className="support-fields">
            <label className="field-label">
              Name
              <Input
                value={state.contact.name}
                onChange={(e) => updateContact({ ...state.contact, name: e.target.value })}
                maxLength={60}
              />
            </label>
            <label className="field-label">
              Relationship
              <Input
                value={state.contact.relationship}
                onChange={(e) => updateContact({ ...state.contact, relationship: e.target.value })}
                maxLength={60}
              />
            </label>
            <label className="field-label">
              Contact method
              <select
                value={state.contact.method}
                onChange={(e) => updateContact({ ...state.contact, method: e.target.value })}
              >
                <option>SMS</option>
                <option>Email</option>
                <option>Phone call</option>
              </select>
            </label>
            <label className="field-label">
              Phone number
              <Input
                type="tel"
                value={state.contact.phone}
                onChange={(e) => updateContact({ ...state.contact, phone: e.target.value })}
                placeholder="e.g. +60 12-345 6789"
                maxLength={20}
              />
            </label>
          </div>
          {phoneError && <small className="field-error">{phoneError}</small>}
          <Button type="submit" className="w-full">
            {state.contact.saved ? <><CheckCircle2 size={16} /> Trusted person saved</> : "Submit trusted person"}
          </Button>
          <small className="support-note">
            Note: a message will only be sent to this person if there is an escalation in your health
            condition (a persistent change after recheck, or a high-concern situation). Nothing is
            sent for everyday readings.
          </small>
          <div className="permission-box">
            <Eyebrow>SHARING PERMISSIONS</Eyebrow>
            <label>
              <input
                type="checkbox"
                checked={state.contact.persistent}
                onChange={(e) => updateContact({ ...state.contact, persistent: e.target.checked })}
              />
              <span>
                <strong>Persistent-change check-ins</strong>
                <small>When a change remains after a recheck</small>
              </span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={state.contact.highConcern}
                onChange={(e) => updateContact({ ...state.contact, highConcern: e.target.checked })}
              />
              <span>
                <strong>High-concern alerts</strong>
                <small>For simulated high-concern situations</small>
              </span>
            </label>
          </div>
        </form>
        <aside className="support-preview">
          <Eyebrow>NOTIFICATION PREVIEW</Eyebrow>
          <div className="preview-avatar">
            <UserRound size={24} />
          </div>
          <h3>{state.contact.name.trim() || "Your trusted person"}</h3>
          <span>
            {state.contact.relationship || "Relationship"} · {state.contact.method}
            {state.contact.phone ? ` · ${state.contact.phone}` : ""}
          </span>
          <div className="preview-message">
            <strong>PulseIQ check-in request</strong>
            <p>
              A persistent change from Alex’s usual health pattern has been detected
              {state.symptoms.length
                ? `. They reported ${state.symptoms.map((s) => s.name).join(" and ")}`
                : ""}
              . Please check in with them.
            </p>
          </div>
          <p className="privacy-copy">
            <ShieldCheck size={15} /> Only a brief check-in request is shared, never full health
            history.
          </p>
          <Button
            onClick={notify}
            disabled={!canNotify || !state.contact.name.trim()}
            className="w-full"
          >
            <Send size={16} />
            {state.notified ? "Send another simulated check-in" : "Trigger trusted support"}
          </Button>
          {!canNotify && (
            <small className="support-hint">
              {state.contact.saved ? "Only available when your health condition escalates (persistent recheck or high concern) with permission enabled." : "Submit your trusted person's phone number first."}
            </small>
          )}
          {state.notified && (
            <div className="sent-message" role="status">
              <CheckCircle2 size={17} /> Simulated notification prepared. No real message was sent.
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

type TrendKey = "heart" | "sleep" | "activity" | "recovery";
const trendConfig: Record<
  TrendKey,
  { label: string; key: keyof Measurement; unit: string; range: string; color: string }
> = {
  heart: { label: "Resting HR", key: "hr", unit: "BPM", range: "62–67 BPM", color: "heart" },
  sleep: { label: "Sleep", key: "sleep", unit: "hours", range: "7–8 hours", color: "sleep" },
  activity: {
    label: "Steps",
    key: "steps",
    unit: "steps",
    range: "7,000–9,000",
    color: "activity",
  },
  recovery: {
    label: "Recovery",
    key: "recovery",
    unit: "/ 100",
    range: "70–85",
    color: "recovery",
  },
};
function SignalCard({
  title,
  value,
  unit,
  usual,
  delta,
  kind,
}: {
  title: string;
  value: string;
  unit: string;
  usual: string;
  delta?: number;
  kind: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span className={`metric-icon ${kind}`}>
          <Activity size={18} />
        </span>
        <span className="metric-delta">
          {delta === undefined ? "In range" : <FormatPercent value={delta} />}
        </span>
      </div>
      <div className="metric-label">{title}</div>
      <div className="metric-value">
        {value}
        <small>{unit}</small>
      </div>
      <div className="metric-footer">
        Usual: <strong>{usual}</strong>
      </div>
    </div>
  );
}
function HealthTrend({ selected }: { selected: TrendKey }) {
  const { state } = usePulse();
  const config = trendConfig[selected];
  const days = state.measurements.slice(-7);
  const values = days.map((d) => Number(d[config.key]));
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const x = (i: number) => 20 + (i * 660) / Math.max(values.length - 1, 1);
  const y = (value: number) => 155 - ((value - min) / Math.max(max - min, 1)) * 125;
  const line = values.map((value, i) => `${i ? "L" : "M"} ${x(i)} ${y(value)}`).join(" ");
  const latest = values.at(-1) ?? 0;
  return (
    <div className="trend-card health-trend">
      <div className="section-header">
        <div>
          <Eyebrow>7-DAY TREND</Eyebrow>
          <h2>{config.label}</h2>
          <p>Simulated values compared with your personal baseline</p>
        </div>
        <span className={`trend-current ${config.color}`}>
          {latest.toLocaleString()} {config.unit}
        </span>
      </div>
      <div className="chart-wrap">
        <svg
          viewBox="0 0 700 175"
          preserveAspectRatio="none"
          role="img"
          aria-label={`${config.label} seven day trend`}
        >
          <path className="chart-grid" d="M 0 30 H 700 M 0 90 H 700 M 0 150 H 700" />
          <path className="chart-line" d={line} />
          {values.map((value, i) => (
            <circle className="chart-point" key={i} cx={x(i)} cy={y(value)} r="5" />
          ))}
        </svg>
      </div>
      <div className="chart-labels">
        {days.map((d) => (
          <span key={d.day}>{d.day}</span>
        ))}
      </div>
      <div className="trend-baseline">
        Personal baseline: <strong>{config.range}</strong>
      </div>
    </div>
  );
}
export function HealthData() {
  const { state } = usePulse();
  const [selected, setSelected] = useState<TrendKey>("heart");
  const [whyRecovery, setWhyRecovery] = useState(false);
  const { latest, deviation } = detect(state.measurements);
  return (
    <>
      <PageHeading
        eyebrow="YOUR SIGNALS, IN CONTEXT"
        title="Health data"
        description="A fuller view of your simulated health pattern, always compared with your personal baseline."
      />
      <div className="profile-section recovery-card recovery-top">
        <Eyebrow>RECOVERY / READINESS</Eyebrow>
        <h2>{latest.recovery} / 100</h2>
        <p>
          {latest.recovery < ranges.recovery[0]
            ? "Below your usual range"
            : "Within your usual range"}
        </p>
        <div className="chips">
          <span className="chip">Resting HR {latest.hr > ranges.hr[1] ? "↑" : "—"}</span>
          <span className="chip">HRV {latest.hrv < ranges.hrv[0] ? "↓" : "—"}</span>
          <span className="chip">Sleep {latest.sleep < ranges.sleep[0] ? "↓" : "—"}</span>
        </div>
        <Button variant="outline" onClick={() => setWhyRecovery((v) => !v)}>
          Why is my recovery lower?
        </Button>
        {whyRecovery && (
          <div className="explanation">
            Your recovery is lower mainly because sleep duration decreased while resting heart rate
            remained above your usual range. This is an interpretation of the simulated signals, not
            a medical conclusion.
          </div>
        )}
      </div>
      <div className="section-title-row">
        <div>
          <Eyebrow>TODAY'S HEALTH SNAPSHOT</Eyebrow>
          <h2>How your signals compare</h2>
        </div>
        <span>Current value · personal usual</span>
      </div>
      <div className="health-snapshot">
        <SignalCard
          title="Resting HR"
          value={`${latest.hr}`}
          unit="BPM"
          usual="62–67"
          delta={deviation.hr}
          kind="heart"
        />
        <SignalCard
          title="HRV"
          value={`${latest.hrv}`}
          unit="ms"
          usual="51–62"
          delta={deviation.hrv}
          kind="activity"
        />
        <SignalCard
          title="Sleep"
          value={`${latest.sleep.toFixed(1)}`}
          unit="hours"
          usual="7–8h"
          delta={deviation.sleep}
          kind="sleep"
        />
        <SignalCard
          title="SpO2"
          value={`${latest.spo2}`}
          unit="%"
          usual="95–100%"
          kind="activity"
        />
        <SignalCard
          title="Respiratory rate"
          value={`${latest.respiratoryRate}`}
          unit="/min"
          usual="14–16"
          kind="sleep"
        />
        <SignalCard
          title="Activity"
          value={latest.steps.toLocaleString()}
          unit="steps"
          usual="7,000–9,000"
          delta={deviation.steps}
          kind="activity"
        />
      </div>
      <div className="data-grid">
        <div>
          <div className="trend-tabs">
            {(Object.keys(trendConfig) as TrendKey[]).map((key) => (
              <button
                className={selected === key ? "trend-tab active" : "trend-tab"}
                key={key}
                onClick={() => setSelected(key)}
              >
                {trendConfig[key].label}
              </button>
            ))}
          </div>
          <HealthTrend selected={selected} />
        </div>
        <div className="data-side">
          <div className="profile-section">
            <Eyebrow>SLEEP BREAKDOWN</Eyebrow>
            <h2>Last night</h2>
            {[
              ["Total sleep", `${latest.sleep.toFixed(1)}h`],
              ["Sleep score", `${latest.sleepScore} / 100`],
              ["Deep sleep", `${Math.round(latest.deepSleep * 60)}m`],
              ["REM", `${Math.round(latest.remSleep * 60)}m`],
              ["Light sleep", `${Math.round(latest.lightSleep * 60)}m`],
              ["Awake", `${Math.round(latest.awake * 60)}m`],
            ].map(([label, value]) => (
              <div className="data-row" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
function HealthSummaryPanel() {
  const { state, setReportGenerated } = usePulse();
  const generate = () => {
    let ai = null;
    try { ai = JSON.parse(sessionStorage.getItem("pulseiq-companion") || "null"); } catch { ai = null; }
    buildReport(state, ai);
    setReportGenerated(true);
  };
  return (
    <div className="report-block">
      <div className="report-hero">
        <div>
          <Eyebrow>PERSONAL HEALTH SUMMARY</Eyebrow>
          <h2>PulseIQ Health Summary</h2>
          <p>Six pages connecting data, pattern, context, understanding, action, and recheck.</p>
        </div>
        <Button onClick={generate}>
          <FileText size={17} /> Generate Health Summary
        </Button>
      </div>
      {state.reportGenerated && (
        <div className="report-success">
          <CheckCircle2 size={18} /> Your current simulation report was downloaded locally as a PDF.
        </div>
      )}
      <p className="medical-note">
        <CircleAlert size={16} /> This report is based on simulated personal health patterns and is
        not a medical diagnosis.
      </p>
    </div>
  );
}

