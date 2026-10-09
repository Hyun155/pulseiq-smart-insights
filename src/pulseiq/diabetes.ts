/**
 * DiaBuddy diabetes rules — pure, deterministic, simulation-only.
 * Educational guidance for adults with Type 2 diabetes; never a diagnosis, dose change or prescription.
 */
import type { SimulationDay, SimulationPreset } from './engine';

export type Lang = 'en' | 'bm';
export type GlucoseDay = { day: string; fasting: number; postMeal: number; carbs: number };
export type GlucoseStatus = 'critical-low' | 'low' | 'target' | 'high' | 'critical-high';

export const glucoseTargets = { fasting: [4.4, 7.0], postMeal: [4.4, 8.5], low: 3.9, criticalLow: 3.0, criticalHigh: 13.9 } as const;

const baseGlucose: GlucoseDay[] = [
  { day: 'Mon', fasting: 5.9, postMeal: 7.6, carbs: 165 }, { day: 'Tue', fasting: 6.1, postMeal: 7.9, carbs: 172 },
  { day: 'Wed', fasting: 5.7, postMeal: 7.3, carbs: 158 }, { day: 'Thu', fasting: 6.2, postMeal: 8.1, carbs: 178 },
  { day: 'Fri', fasting: 5.8, postMeal: 7.5, carbs: 162 }, { day: 'Sat', fasting: 6.0, postMeal: 8.0, carbs: 175 },
  { day: 'Sun', fasting: 5.6, postMeal: 7.2, carbs: 155 },
];
const scenarioGlucose: Record<Exclude<SimulationPreset, 'baseline'>, GlucoseDay[]> = {
  viral: [ // hawker meal spike
    { day: 'Day 1', fasting: 6.0, postMeal: 8.4, carbs: 190 },
    { day: 'Day 2', fasting: 6.5, postMeal: 10.8, carbs: 245 },
    { day: 'Day 3', fasting: 6.9, postMeal: 11.6, carbs: 260 },
  ],
  dehydration: [ // hypoglycaemia risk (skipped meals, elderly)
    { day: 'Day 1', fasting: 5.2, postMeal: 7.0, carbs: 120 },
    { day: 'Day 2', fasting: 4.4, postMeal: 6.1, carbs: 95 },
    { day: 'Day 3', fasting: 3.6, postMeal: 5.4, carbs: 80 },
  ],
  stress: [ // missed medication & late-night snacking
    { day: 'Day 1', fasting: 6.6, postMeal: 9.0, carbs: 200 },
    { day: 'Day 2', fasting: 7.3, postMeal: 9.8, carbs: 215 },
    { day: 'Day 3', fasting: 7.9, postMeal: 10.4, carbs: 225 },
  ],
};

export const diabetesPresetLabels: Record<SimulationPreset, string> = {
  baseline: 'Well-controlled week', viral: 'Hawker meal glucose spike', dehydration: 'Low sugar risk (Elderly)', stress: 'Missed meds & late snacking',
};

export function glucoseForPreset(preset: SimulationPreset, day: SimulationDay): GlucoseDay[] {
  return preset === 'baseline' ? baseGlucose : [...baseGlucose, ...scenarioGlucose[preset].slice(0, day)];
}

export function fastingStatus(v: number): GlucoseStatus {
  if (v < glucoseTargets.criticalLow) return 'critical-low';
  if (v < glucoseTargets.low) return 'low';
  if (v > glucoseTargets.criticalHigh) return 'critical-high';
  if (v > glucoseTargets.fasting[1]) return 'high';
  return 'target';
}
export function postMealStatus(v: number): GlucoseStatus {
  if (v < glucoseTargets.low) return 'low';
  if (v > glucoseTargets.criticalHigh) return 'critical-high';
  if (v > glucoseTargets.postMeal[1]) return 'high';
  return 'target';
}
export const statusLabel: Record<GlucoseStatus, { en: string; bm: string }> = {
  'critical-low': { en: 'Very low', bm: 'Sangat rendah' }, low: { en: 'Low', bm: 'Rendah' }, target: { en: 'In target', bm: 'Dalam sasaran' },
  high: { en: 'Above target', bm: 'Melebihi sasaran' }, 'critical-high': { en: 'Very high', bm: 'Sangat tinggi' },
};

export function glucoseSummary(days: GlucoseDay[]) {
  const recent = days.slice(-7);
  const readings = recent.flatMap(d => [d.fasting, d.postMeal]);
  const inRange = readings.filter(v => v >= 3.9 && v <= 10).length;
  const avgFasting = recent.reduce((s, d) => s + d.fasting, 0) / recent.length;
  const avgPost = recent.reduce((s, d) => s + d.postMeal, 0) / recent.length;
  // ADAG-style estimate from mean glucose (mmol/L): eA1c% = (mean*18 + 46.7)/28.7 — an estimate only.
  const mean = readings.reduce((s, v) => s + v, 0) / readings.length;
  const estA1c = (mean * 18 + 46.7) / 28.7;
  const latest = days.at(-1)!;
  const last3 = days.slice(-3);
  const rising = last3.length === 3 && last3[0]!.postMeal < last3[1]!.postMeal && last3[1]!.postMeal < last3[2]!.postMeal;
  const falling = last3.length === 3 && last3[0]!.fasting > last3[1]!.fasting && last3[1]!.fasting > last3[2]!.fasting;
  return { latest, timeInRange: Math.round((inRange / readings.length) * 100), avgFasting, avgPost, estA1c, rising, falling, fasting: fastingStatus(latest.fasting), post: postMealStatus(latest.postMeal) };
}

/* ---------------- Malaysia-aware meals ---------------- */
export type Cuisine = 'malay' | 'chinese' | 'indian' | 'mixed';
export type Meal = {
  id: string; slot: 'breakfast' | 'lunch' | 'dinner'; name: string; nameBM: string; cuisine: Cuisine; vegetarian: boolean; halal: boolean;
  out: boolean; price: number; kcal: number; carbs: number; protein: number; fibre: number; sodium: number;
  why: { en: string; bm: string }; swap: { en: string; bm: string }; swapCarbs: number;
};
export const meals: Meal[] = [
  { id: 'nasi-lemak', slot: 'breakfast', name: 'Nasi lemak (half rice)', nameBM: 'Nasi lemak (separuh nasi)', cuisine: 'malay', vegetarian: false, halal: true, out: true, price: 5, kcal: 420, carbs: 48, protein: 16, fibre: 3, sodium: 780,
    why: { en: 'Familiar breakfast kept workable by halving the coconut rice and keeping the egg and peanuts for protein.', bm: 'Sarapan biasa yang masih sesuai jika nasi dikurangkan separuh, dengan telur dan kacang untuk protein.' },
    swap: { en: 'Ask for half rice, extra boiled egg and timun, sambal on the side. Teh O kosong instead of teh tarik.', bm: 'Minta separuh nasi, tambah telur rebus dan timun, sambal asing. Teh O kosong ganti teh tarik.' }, swapCarbs: 38 },
  { id: 'roti-telur', slot: 'breakfast', name: 'Roti bakar wholemeal + half-boiled eggs', nameBM: 'Roti bakar gandum + telur separuh masak', cuisine: 'mixed', vegetarian: true, halal: true, out: true, price: 4.5, kcal: 320, carbs: 30, protein: 15, fibre: 5, sodium: 420,
    why: { en: 'Wholemeal bread digests more slowly and eggs add protein, so the morning rise is gentler.', bm: 'Roti gandum dicerna lebih perlahan dan telur menambah protein, jadi gula naik lebih perlahan.' },
    swap: { en: 'Skip kaya and margarine; Kopi O kurang manis or kosong.', bm: 'Elakkan kaya dan marjerin; Kopi O kurang manis atau kosong.' }, swapCarbs: 26 },
  { id: 'thosai', slot: 'breakfast', name: 'Thosai with dhal', nameBM: 'Tosai dengan dal', cuisine: 'indian', vegetarian: true, halal: true, out: true, price: 4, kcal: 340, carbs: 46, protein: 11, fibre: 6, sodium: 520,
    why: { en: 'Fermented thosai with lentil dhal gives fibre and plant protein — a better pick than roti canai.', bm: 'Tosai yang ditapai dengan dal memberi serat dan protein — lebih baik daripada roti canai.' },
    swap: { en: 'One thosai instead of two; extra dhal, skip the sweet chutney.', bm: 'Satu tosai sahaja; tambah dal, kurangkan chutney manis.' }, swapCarbs: 30 },
  { id: 'chicken-rice', slot: 'lunch', name: 'Steamed chicken rice', nameBM: 'Nasi ayam kukus', cuisine: 'chinese', vegetarian: false, halal: true, out: true, price: 8, kcal: 560, carbs: 65, protein: 30, fibre: 2, sodium: 1100,
    why: { en: 'Steamed (not roasted) chicken keeps fat lower; rice is the main carb so portion matters most.', bm: 'Ayam kukus kurang lemak; nasi ialah karbohidrat utama, jadi saiz hidangan paling penting.' },
    swap: { en: 'Half portion of plain rice (not oily rice), add sawi or taugeh, skip the soup salt.', bm: 'Separuh nasi putih (bukan nasi berminyak), tambah sawi atau taugeh.' }, swapCarbs: 42 },
  { id: 'nasi-campur', slot: 'lunch', name: 'Nasi campur (¼ ¼ ½ plate)', nameBM: 'Nasi campur (pinggan suku-suku separuh)', cuisine: 'malay', vegetarian: false, halal: true, out: true, price: 9, kcal: 520, carbs: 50, protein: 28, fibre: 7, sodium: 900,
    why: { en: 'Following the Malaysian Healthy Plate — quarter rice, quarter protein, half vegetables — balances the meal.', bm: 'Ikut Pinggan Sihat Malaysia — suku nasi, suku protein, separuh sayur — untuk hidangan seimbang.' },
    swap: { en: 'Choose ikan bakar or ayam masak kicap over fried; two vegetable dishes; avoid kuah on the rice.', bm: 'Pilih ikan bakar atau ayam masak kicap, dua jenis sayur, elak kuah atas nasi.' }, swapCarbs: 40 },
  { id: 'veg-rice', slot: 'lunch', name: 'Economy vegetarian rice', nameBM: 'Nasi sayur ekonomi', cuisine: 'chinese', vegetarian: true, halal: true, out: true, price: 6.5, kcal: 480, carbs: 55, protein: 18, fibre: 8, sodium: 850,
    why: { en: 'Tofu and leafy vegetables add fibre and protein, which slows the post-meal glucose rise.', bm: 'Tauhu dan sayur berdaun menambah serat dan protein yang melambatkan kenaikan gula.' },
    swap: { en: 'Brown rice if available; choose stir-fried greens over deep-fried items.', bm: 'Pilih nasi perang jika ada; sayur goreng sikit minyak, bukan goreng celup.' }, swapCarbs: 45 },
  { id: 'banana-leaf', slot: 'lunch', name: 'Banana leaf rice (light)', nameBM: 'Nasi daun pisang (ringan)', cuisine: 'indian', vegetarian: false, halal: true, out: true, price: 10, kcal: 600, carbs: 70, protein: 24, fibre: 9, sodium: 1000,
    why: { en: 'Plenty of vegetables and dhal come with it — the rice refill is the part to watch.', bm: 'Banyak sayur dan dal — tambahan nasi yang perlu dikawal.' },
    swap: { en: 'Say no to the rice refill, pick fish or chicken curry with less gravy, skip papadom.', bm: 'Tolak tambah nasi, pilih kari ikan/ayam kurang kuah, kurangkan papadom.' }, swapCarbs: 48 },
  { id: 'ikan-bakar', slot: 'dinner', name: 'Ikan bakar with ulam', nameBM: 'Ikan bakar dengan ulam', cuisine: 'malay', vegetarian: false, halal: true, out: false, price: 12, kcal: 430, carbs: 30, protein: 34, fibre: 7, sodium: 700,
    why: { en: 'Grilled fish and raw ulam are low in carbs — good for steadier overnight glucose.', bm: 'Ikan bakar dan ulam rendah karbohidrat — baik untuk gula yang stabil waktu malam.' },
    swap: { en: 'Small scoop of rice, extra ulam and air asam instead of sweet sauce.', bm: 'Sedikit nasi, lebih ulam dan air asam, bukan sos manis.' }, swapCarbs: 25 },
  { id: 'yong-tau-foo', slot: 'dinner', name: 'Yong tau foo (clear soup)', nameBM: 'Yong tau foo (sup jernih)', cuisine: 'chinese', vegetarian: false, halal: false, out: true, price: 9, kcal: 380, carbs: 28, protein: 26, fibre: 6, sodium: 1200,
    why: { en: 'Pick-your-own lets you load up on vegetables and tofu with few noodles.', bm: 'Anda boleh pilih banyak sayur dan tauhu dengan sedikit mi.' },
    swap: { en: 'Choose fresh items over fried; ask for less noodles and sauce on the side.', bm: 'Pilih bahan segar bukan goreng; kurangkan mi, sos asing.' }, swapCarbs: 20 },
  { id: 'chapati', slot: 'dinner', name: 'Chapati with dhal & vegetable curry', nameBM: 'Capati dengan dal & kari sayur', cuisine: 'indian', vegetarian: true, halal: true, out: true, price: 6, kcal: 400, carbs: 45, protein: 14, fibre: 9, sodium: 650,
    why: { en: 'Chapati has no added oil like roti canai, and dhal adds fibre for slower absorption.', bm: 'Capati tidak berminyak seperti roti canai, dan dal menambah serat.' },
    swap: { en: 'One chapati instead of two; extra vegetables.', bm: 'Satu capati sahaja; tambah sayur.' }, swapCarbs: 30 },
];
export type MealPrefs = { cuisine: Cuisine | 'any'; vegetarian: boolean; halal: boolean; budget: number; eatingOut: boolean };
export const defaultPrefs: MealPrefs = { cuisine: 'any', vegetarian: false, halal: true, budget: 10, eatingOut: true };

export function planMeals(prefs: MealPrefs, status: GlucoseStatus) {
  const pick = (slot: Meal['slot']) => {
    let options = meals.filter(m => m.slot === slot && (!prefs.vegetarian || m.vegetarian) && (!prefs.halal || m.halal) && m.price <= prefs.budget && (prefs.eatingOut || !m.out || m.cuisine === 'mixed'));
    if (prefs.cuisine !== 'any') { const c = options.filter(m => m.cuisine === prefs.cuisine); if (c.length) options = c; }
    if (!options.length) options = meals.filter(m => m.slot === slot && (!prefs.vegetarian || m.vegetarian));
    const sorted = [...options].sort((a, b) => status === 'high' || status === 'critical-high' ? a.carbs - b.carbs : status === 'low' || status === 'critical-low' ? b.carbs - a.carbs : b.fibre - a.fibre);
    return sorted[0]!;
  };
  return { breakfast: pick('breakfast'), lunch: pick('lunch'), dinner: pick('dinner') };
}
export function plateAdvice(status: GlucoseStatus, lang: Lang): string {
  const t = {
    high: { en: 'Your recent readings are above target, so today\'s plan picks the lowest-carb option in each slot and keeps rice to a quarter of the plate.', bm: 'Bacaan terkini melebihi sasaran, jadi pelan hari ini memilih hidangan paling rendah karbohidrat dan nasi suku pinggan sahaja.' },
    low: { en: 'Your readings are running low, so do not skip meals today. Each meal keeps a steady portion of carbohydrate, and carry a sweet snack in case you feel shaky.', bm: 'Bacaan anda rendah, jadi jangan tinggal waktu makan. Setiap hidangan ada karbohidrat yang cukup, dan bawa snek manis jika rasa menggeletar.' },
    target: { en: 'Your readings are in target. Today\'s plan favours high-fibre choices to keep it that way.', bm: 'Bacaan anda dalam sasaran. Pelan hari ini memilih hidangan tinggi serat untuk mengekalkannya.' },
  };
  const k = status === 'high' || status === 'critical-high' ? 'high' : status === 'target' ? 'target' : 'low';
  return t[k][lang];
}

/* ---------------- Bilingual companion (rule-based) ---------------- */
export type BuddyReply = { answer: string; why: string; action: string | null; urgent: boolean };
export type BuddyContext = { lang: Lang; latestFasting: number; latestPost: number; medsDue: string[] };

export const quickQuestions: { en: string; bm: string }[] = [
  { en: 'Can I eat nasi lemak this morning?', bm: 'Boleh ke makan nasi lemak pagi ini?' },
  { en: 'I forgot my Metformin. What should I do?', bm: 'Terlupa makan ubat Metformin, nak buat macam mana?' },
  { en: 'What can I order at a mamak restaurant?', bm: 'Apa boleh order di kedai mamak?' },
  { en: 'Why did my sugar go up after lunch?', bm: 'Kenapa gula naik selepas makan tengah hari?' },
  { en: 'I feel shaky and sweaty', bm: 'Saya rasa menggeletar dan berpeluh' },
];

const has = (t: string, words: string[]) => words.some(w => t.includes(w));

export function askBuddy(text: string, ctx: BuddyContext): BuddyReply {
  const t = text.toLowerCase();
  const L = (en: string, bm: string) => (ctx.lang === 'bm' ? bm : en);
  if (has(t, ['shaky', 'sweaty', 'menggeletar', 'berpeluh', 'pening', 'dizzy', 'faint', 'pengsan', 'confus', 'keliru', 'hypo'])) return {
    urgent: true,
    answer: L('These can be signs of low blood sugar. If you can, check your glucose now. If it is below 3.9 mmol/L, follow the low-sugar plan your clinic gave you — commonly 15 g of fast sugar (e.g. half a glass of juice or 3 sweets), then recheck in 15 minutes. If you feel confused or faint, or it does not improve, call 999 or ask someone to help you now.',
      'Ini mungkin tanda gula darah rendah. Jika boleh, periksa gula sekarang. Jika bawah 3.9 mmol/L, ikut pelan gula rendah daripada klinik — biasanya 15 g gula cepat (cth. separuh gelas jus atau 3 gula-gula), kemudian periksa semula selepas 15 minit. Jika keliru, hampir pengsan atau tidak bertambah baik, hubungi 999 atau minta bantuan segera.'),
    why: L('Low sugar can get worse quickly, so DiaBuddy always points to fast action and human help first.', 'Gula rendah boleh menjadi teruk dengan cepat, jadi DiaBuddy sentiasa utamakan tindakan segera dan bantuan manusia.'),
    action: L('Recheck glucose in 15 minutes', 'Periksa semula gula dalam 15 minit'),
  };
  if (has(t, ['forgot', 'missed', 'terlupa', 'lupa', 'tertinggal', 'skip my med', 'metformin', 'ubat'])) return {
    urgent: false,
    answer: L('Please don\'t take an extra or double dose to make up for it. Check the instructions on your medicine label, or ask your pharmacist or clinic what to do for a missed dose. Then continue your usual schedule.',
      'Jangan ambil dos tambahan atau berganda untuk menggantikannya. Semak arahan pada label ubat, atau tanya ahli farmasi atau klinik tentang dos yang tertinggal. Kemudian teruskan jadual biasa.'),
    why: L('DiaBuddy never changes your dose — only your doctor or pharmacist can advise on that.', 'DiaBuddy tidak akan mengubah dos anda — hanya doktor atau ahli farmasi boleh menasihati.'),
    action: L('Call pharmacist about the missed dose', 'Hubungi ahli farmasi tentang dos tertinggal'),
  };
  if (has(t, ['nasi lemak'])) return {
    urgent: false,
    answer: L(`It can fit — try half the rice, an extra boiled egg and timun, sambal on the side, and teh O kosong instead of teh tarik. ${ctx.latestFasting > 7 ? 'Your fasting reading today is above target, so a smaller rice portion matters more today.' : 'Your fasting reading is in target today.'} Everyone's needs are different.`,
      `Boleh dipertimbangkan — cuba separuh nasi, tambah telur rebus dan timun, sambal asing, dan teh O kosong ganti teh tarik. ${ctx.latestFasting > 7 ? 'Bacaan gula puasa hari ini melebihi sasaran, jadi kurangkan nasi lebih penting hari ini.' : 'Bacaan gula puasa anda dalam sasaran hari ini.'} Keperluan setiap orang berbeza.`),
    why: L('Coconut rice is the main carbohydrate; halving it cuts about 10–15 g of carbs.', 'Nasi santan ialah sumber karbohidrat utama; separuh nasi mengurangkan kira-kira 10–15 g karbohidrat.'),
    action: L('Check glucose 2 hours after breakfast', 'Periksa gula 2 jam selepas sarapan'),
  };
  if (has(t, ['mamak', 'roti canai', 'teh tarik', 'hawker', 'gerai', 'kedai', 'order', 'makan luar', 'eat out'])) return {
    urgent: false,
    answer: L('Good mamak picks: roti bakar or chapati with dhal, tandoori chicken, thosai, or mee goreng with extra vegetables and half noodles. Drinks: teh O kosong, kopi O kurang manis, or plain water. Limit roti canai, nasi kandar gravy and sweet drinks.',
      'Pilihan di mamak: roti bakar atau capati dengan dal, ayam tandoori, tosai, atau mee goreng tambah sayur separuh mi. Minuman: teh O kosong, kopi O kurang manis atau air kosong. Kurangkan roti canai, kuah nasi kandar dan minuman manis.'),
    why: L('Sweet drinks add carbs fast without filling you up — swapping them is the easiest win.', 'Minuman manis menambah karbohidrat dengan cepat — menukarnya ialah langkah paling mudah.'),
    action: L('Log your mamak meal', 'Rekod hidangan di mamak'),
  };
  if (has(t, ['why', 'kenapa', 'spike', 'naik', 'high', 'tinggi', 'after lunch', 'tengah hari'])) return {
    urgent: false,
    answer: L(`Your latest after-meal reading is ${ctx.latestPost.toFixed(1)} mmol/L (target below 8.5). Common reasons: a large rice or noodle portion, sweet drinks, less walking after meals, stress, or a missed dose. A 10–15 minute walk after eating often helps.`,
      `Bacaan selepas makan terkini ialah ${ctx.latestPost.toFixed(1)} mmol/L (sasaran bawah 8.5). Sebab biasa: nasi atau mi yang banyak, minuman manis, kurang berjalan selepas makan, stres atau dos tertinggal. Berjalan 10–15 minit selepas makan biasanya membantu.`),
    why: L('DiaBuddy compares your reading with your usual week to point out the likely everyday cause — not a diagnosis.', 'DiaBuddy membandingkan bacaan dengan minggu biasa anda untuk menunjukkan punca harian — bukan diagnosis.'),
    action: L('Take a 15-minute walk after dinner', 'Berjalan 15 minit selepas makan malam'),
  };
  if (has(t, ['exercise', 'walk', 'senaman', 'jalan', 'gym'])) return {
    urgent: false,
    answer: L('Aim for about 150 minutes of moderate activity a week — for example a 30-minute brisk walk 5 days a week, or short walks after meals. If your sugar is below 4.0 mmol/L, eat something first.',
      'Sasarkan kira-kira 150 minit aktiviti sederhana seminggu — contohnya jalan laju 30 minit 5 hari seminggu, atau jalan singkat selepas makan. Jika gula bawah 4.0 mmol/L, makan sesuatu dahulu.'),
    why: L('Muscles use glucose during and after activity, which helps lower readings.', 'Otot menggunakan glukosa semasa dan selepas aktiviti, membantu menurunkan bacaan.'),
    action: L('Walk 30 minutes today', 'Berjalan 30 minit hari ini'),
  };
  return {
    urgent: false,
    answer: L('I can help with local food choices, missed medicine, glucose readings and daily routines. Try one of the quick questions below. For anything about changing treatment, please speak with your doctor.',
      'Saya boleh bantu tentang pilihan makanan tempatan, ubat tertinggal, bacaan gula dan rutin harian. Cuba soalan cepat di bawah. Untuk perubahan rawatan, sila berbincang dengan doktor.'),
    why: L('DiaBuddy gives educational guidance only.', 'DiaBuddy memberi panduan pendidikan sahaja.'),
    action: null,
  };
}

/* ---------------- Next best action ---------------- */
export function nextBestAction(opts: { fasting: number; post: number; medsDue: string[]; mealsLogged: number; lang: Lang }) {
  const L = (en: string, bm: string) => (opts.lang === 'bm' ? bm : en);
  if (opts.fasting < glucoseTargets.low) return { tone: 'urgent' as const, title: L('Treat low sugar first', 'Rawat gula rendah dahulu'), why: L(`Your fasting reading is ${opts.fasting.toFixed(1)} mmol/L, below 3.9. Have 15 g of fast sugar, recheck in 15 minutes, then eat a regular meal.`, `Bacaan puasa anda ${opts.fasting.toFixed(1)} mmol/L, bawah 3.9. Ambil 15 g gula cepat, periksa semula dalam 15 minit, kemudian makan seperti biasa.`) };
  if (opts.medsDue.length) return { tone: 'normal' as const, title: L(`Take ${opts.medsDue[0]} with breakfast`, `Ambil ${opts.medsDue[0]} bersama sarapan`), why: L('It is on your clinician-provided schedule for this morning.', 'Ia dalam jadual ubat pagi ini daripada klinik anda.') };
  if (opts.post > glucoseTargets.postMeal[1]) return { tone: 'watch' as const, title: L('Take a 15-minute walk after your next meal', 'Berjalan 15 minit selepas hidangan seterusnya'), why: L(`Your after-meal reading was ${opts.post.toFixed(1)} mmol/L, above 8.5. A short walk helps your muscles use that sugar.`, `Bacaan selepas makan ${opts.post.toFixed(1)} mmol/L, melebihi 8.5. Berjalan sebentar membantu otot menggunakan gula.`) };
  if (opts.mealsLogged === 0) return { tone: 'normal' as const, title: L('Log your breakfast', 'Rekod sarapan anda'), why: L('Logging meals lets DiaBuddy connect food to your readings and build your doctor summary.', 'Merekod makanan membantu DiaBuddy mengaitkan makanan dengan bacaan dan menyediakan ringkasan doktor.') };
  return { tone: 'normal' as const, title: L('Record your 2-hour after-meal glucose', 'Rekod gula 2 jam selepas makan'), why: L('Your readings are on track — one more check keeps the picture complete.', 'Bacaan anda baik — satu lagi semakan melengkapkan gambaran.') };
}
