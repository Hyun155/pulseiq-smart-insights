import { jsPDF } from "jspdf";
import { actionLevel, analyzeToday, baseline, detect, ranges, type Measurement, type State } from "./engine";

const W = 210, M = 18, CW = W - M * 2;
const levelLabel = { green: "Monitor", yellow: "Recheck", orange: "Follow up", red: "High concern" } as const;

class Doc {
  pdf = new jsPDF();
  y = 0;
  page = 0;
  total = 6;
  newPage(title: string, subtitle: string) {
    if (this.page > 0) this.pdf.addPage();
    this.page++;
    const p = this.pdf;
    p.setFillColor(22, 110, 98);
    p.rect(0, 0, W, 14, "F");
    p.setTextColor(255, 255, 255);
    p.setFont("helvetica", "bold"); p.setFontSize(10);
    p.text("PulseIQ Health Summary · Alex Morgan (simulated)", M, 9);
    p.text(`Page ${this.page} of ${this.total}`, W - M, 9, { align: "right" });
    p.setTextColor(20, 40, 36);
    p.setFontSize(20); p.text(title, M, 30);
    p.setFont("helvetica", "normal"); p.setFontSize(10); p.setTextColor(90, 110, 105);
    p.text(subtitle, M, 37);
    p.setTextColor(20, 40, 36);
    this.y = 48;
    p.setFontSize(7.5); p.setTextColor(120, 130, 128);
    p.text(p.splitTextToSize("PulseIQ identifies changes in simulated personal health patterns. This report is not a medical diagnosis and is intended for personal reference and discussion with a healthcare professional.", CW), M, 284);
    p.setTextColor(20, 40, 36);
  }
  heading(t: string) { this.ensure(14); const p = this.pdf; p.setFont("helvetica", "bold"); p.setFontSize(12.5); p.text(t, M, this.y); this.y += 7; }
  para(t: string, size = 10) {
    const p = this.pdf; p.setFont("helvetica", "normal"); p.setFontSize(size);
    const lines = p.splitTextToSize(t, CW) as string[];
    this.ensure(lines.length * 5); p.text(lines, M, this.y); this.y += lines.length * 5 + 2;
  }
  bullets(items: string[]) { items.forEach(i => { const p = this.pdf; p.setFont("helvetica", "normal"); p.setFontSize(10); const l = p.splitTextToSize(i, CW - 6) as string[]; this.ensure(l.length * 5); p.text("•", M, this.y); p.text(l, M + 5, this.y); this.y += l.length * 5 + 1.5; }); this.y += 2; }
  table(head: string[], rows: string[][], widths: number[]) {
    const p = this.pdf; const x0 = M;
    const row = (cells: string[], bold: boolean, fill?: [number, number, number]) => {
      p.setFont("helvetica", bold ? "bold" : "normal"); p.setFontSize(8.5);
      const wrapped = cells.map((c, i) => p.splitTextToSize(c, widths[i]! - 3) as string[]);
      const h = Math.max(...wrapped.map(w => w.length)) * 4.2 + 3;
      this.ensure(h);
      if (fill) { p.setFillColor(...fill); p.rect(x0, this.y - 4, CW, h, "F"); }
      let x = x0; wrapped.forEach((w, i) => { p.text(w, x + 1.5, this.y); x += widths[i]!; });
      p.setDrawColor(220, 228, 226); p.line(x0, this.y - 4 + h, x0 + CW, this.y - 4 + h);
      this.y += h;
    };
    row(head, true, [232, 243, 240]);
    rows.forEach(r => row(r, false));
    this.y += 4;
  }
  box(label: string, text: string, color: [number, number, number]) {
    const p = this.pdf; p.setFontSize(10); p.setFont("helvetica", "normal");
    const lines = p.splitTextToSize(text, CW - 10) as string[]; const h = lines.length * 5 + 12;
    this.ensure(h); p.setFillColor(...color); p.roundedRect(M, this.y - 4, CW, h, 2, 2, "F");
    p.setFont("helvetica", "bold"); p.setFontSize(9); p.text(label.toUpperCase(), M + 5, this.y + 2);
    p.setFont("helvetica", "normal"); p.setFontSize(10); p.text(lines, M + 5, this.y + 8); this.y += h + 4;
  }
  chart(title: string, days: Measurement[], key: "hr" | "sleep" | "steps" | "recovery", range: readonly [number, number], unit: string) {
    const p = this.pdf; const h = 34; this.ensure(h + 14);
    p.setFont("helvetica", "bold"); p.setFontSize(10); p.text(title, M, this.y); this.y += 3;
    const vals = days.map(d => d[key]); const max = Math.max(...vals, range[1]) * 1.1;
    const top = this.y, bw = CW / days.length;
    const y = (v: number) => top + h - (v / max) * h;
    p.setFillColor(222, 240, 235); p.rect(M, y(range[1]), CW, y(range[0]) - y(range[1]), "F");
    days.forEach((d, i) => {
      const v = d[key]; const out = v < range[0] || v > range[1];
      out ? p.setFillColor(214, 96, 72) : p.setFillColor(38, 140, 124);
      p.rect(M + i * bw + bw * 0.2, y(v), bw * 0.6, top + h - y(v), "F");
      p.setFont("helvetica", "normal"); p.setFontSize(6.5); p.setTextColor(60, 70, 68);
      p.text(String(key === "steps" ? Math.round(v / 100) / 10 + "k" : v), M + i * bw + bw / 2, y(v) - 1, { align: "center" });
      p.text(d.day, M + i * bw + bw / 2, top + h + 4, { align: "center" });
    });
    p.setTextColor(90, 110, 105); p.text(`Shaded band = usual range ${range[0]}–${range[1]}${unit}. Red bars are outside it.`, M, top + h + 9);
    p.setTextColor(20, 40, 36); this.y = top + h + 15;
  }
  ensure(h: number) { if (this.y + h > 275) { this.pdf.addPage(); this.y = 24; } }
}

export function buildReport(state: State, ai?: { dailySummary?: string; response?: string } | null) {
  const d = new Doc();
  const level = actionLevel(state);
  const det = detect(state.measurements);
  const today = analyzeToday(det.latest);
  const days = state.measurements.slice(-10);
  const status = level === "green" ? "Monitoring — within usual pattern" : state.scenario === "improved" ? "Improving" : state.scenario === "persistent" ? "Persistent change" : state.scenario === "worsening" ? "Worsening" : "Meaningful change detected";
  const userAnswers = state.messages.filter(m => m.role === "user");

  // 1 Summary
  d.newPage("Health Summary", `Generated ${new Date().toLocaleString()} · simulated data`);
  d.table(["Field", "Value"], [["Name", "Alex Morgan (fictional)"], ["Observation period", `${days[0]?.day ?? "-"} to ${det.latest.day} (${days.length} days)`], ["Current status", status], ["Action level", `${level.toUpperCase()} · ${levelLabel[level]}`], ["Signals changed together", `${det.signalCount}`], ["Days outside pattern", `${det.duration}`]], [60, CW - 60]);
  d.box("Today at a glance", today.overall + (ai?.dailySummary ? " " + ai.dailySummary : ""), level === "green" ? [226, 243, 236] : level === "red" ? [250, 226, 222] : [252, 238, 222]);
  d.heading("Today's measurements");
  d.table(["Metric", "Today", "Usual range", "vs baseline", "Status"], today.metrics.map(m => [m.label, m.value, m.usual, `${m.change > 0 ? "+" : ""}${m.change}%`, m.status.toUpperCase()]), [52, 30, 36, 28, CW - 146]);

  // 2 Trends
  d.newPage("Trends", "Daily values compared with your personal baseline range");
  d.chart("Resting heart rate (BPM)", days, "hr", ranges.hr, " BPM");
  d.chart("Sleep (hours)", days, "sleep", ranges.sleep, " h");
  d.chart("Daily steps", days, "steps", ranges.steps, "");
  d.chart("Recovery score", days, "recovery", ranges.recovery, "");

  // 3 Detected pattern + full data
  d.newPage("Detected Pattern", "What changed, for how long, and the evidence");
  d.para(det.persistent ? `${det.signalCount} health signals moved away from your usual pattern together for ${det.duration} consecutive days. ${det.trend ? "Resting heart rate has been trending upward day by day." : ""} A change across several signals at once is more meaningful than a single unusual reading.` : "No persistent multi-signal change is currently detected. Your measurements remain close to your usual pattern.");
  d.heading("What each out-of-range reading may represent");
  d.bullets(today.outOfRange.length ? today.outOfRange.map(m => `${m.label} ${m.status} (${m.value}, usual ${m.usual}): ${m.meaning}`) : ["All readings are within your usual range today."]);
  d.heading("Personal baseline (7-day average)");
  d.table(["HR", "HRV", "Sleep", "Steps", "SpO2", "Resp.", "Recovery"], [[baseline.hr.toFixed(1), baseline.hrv.toFixed(1), baseline.sleep.toFixed(1) + " h", Math.round(baseline.steps).toLocaleString(), baseline.spo2.toFixed(1) + "%", baseline.respiratoryRate.toFixed(1), baseline.recovery.toFixed(0)]], Array(7).fill(CW / 7));
  d.heading("Daily data");
  d.table(["Day", "HR", "HRV", "Sleep", "Steps", "SpO2", "Resp.", "Recov."], days.map(m => [m.day, `${m.hr}`, `${m.hrv}`, `${m.sleep}`, m.steps.toLocaleString(), `${m.spo2}`, `${m.respiratoryRate}`, `${m.recovery}`]), [26, 20, 20, 20, 26, 20, 20, CW - 152]);

  // 4 Symptoms & context
  d.newPage("Symptoms & Context", "User-reported information, kept separate from measured signals");
  d.table(["Symptom", "Severity"], state.symptoms.length ? state.symptoms.map(s => [s.name, s.severity]) : [["None reported", "-"]], [90, CW - 90]);
  d.table(["Context", "Details"], [["Medication", state.medication || "Not recorded"], ["Cycle / wellbeing", state.cycle || "Not recorded"], ["Lifestyle notes", state.notes || "Not recorded"]], [50, CW - 50]);
  d.para("Symptoms and context occurred alongside the measured changes; this report does not imply one caused the other.", 9);

  // 5 AI check-in
  d.newPage("AI Check-in Summary", "The conversation that added context to the detected pattern");
  d.para(`Reason for check-in: ${state.scenario === "stable" ? "No active check-in — pattern stable." : "Several signals changed together from your usual pattern."} Questions answered: ${state.step} of 3.`);
  if (state.messages.length) { d.heading("Conversation"); state.messages.forEach(m => d.para(`${m.role === "user" ? "Alex" : "PulseIQ"}: ${m.text}`, 9.5)); }
  if (ai?.response) d.box("AI assessment", ai.response, [232, 243, 240]);
  if (!state.messages.length && !ai?.response) d.para("No check-in conversation has taken place yet.");
  d.para(`User responses recorded: ${userAnswers.length}. The AI adds context but never overrides the rule-based safety levels.`, 9);

  // 6 Follow-up
  d.newPage("Follow-up & Timeline", "Actions taken, recheck result, and questions for a professional");
  d.table(["Item", "Status"], [["Check-in", state.step >= 3 ? "Completed" : state.scenario === "stable" ? "Not needed" : "In progress"], ["Recheck", state.recheck === "complete" ? `Complete — ${state.scenario}` : state.recheck === "pending" ? "Scheduled" : "Not scheduled"], ["Trusted support", state.notified ? `${state.contact.name} notified (simulated ${state.contact.method})` : "Not notified"]], [60, CW - 60]);
  d.heading("Recommended next step");
  d.para(level === "red" ? "Seek prompt medical attention, especially if symptoms are severe or sudden." : level === "orange" ? "Consider booking a follow-up with a healthcare professional and share this report." : level === "yellow" ? "Rest, hydrate and recheck in 24–48 hours. Follow up if the pattern continues." : "Keep your usual routine; PulseIQ will keep monitoring.");
  d.heading("Timeline");
  d.bullets(state.events.map(e => `${e.label} — ${e.detail}`));
  d.heading("Questions to discuss with a healthcare professional");
  d.bullets(["When did these changes begin, and have they happened before?", "Could recent sleep, stress, medication or routine changes be relevant?", "Which additional measurements or tests might be useful?", "What symptoms should prompt urgent care?"]);

  d.pdf.save("pulseiq-health-summary.pdf");
}
