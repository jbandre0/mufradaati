import { useState, useEffect, useMemo } from "react";
import { Check, Plus, Minus, Trash2, Flame, Settings2, Sparkles, X, ChevronDown, ChevronRight, Shuffle, ArrowUp, ArrowDown, PenLine, Dumbbell, Lightbulb, Copy, ListPlus, ImagePlus, Upload } from "lucide-react";

/* ---------- constants ---------- */
const ALL = [0, 1, 2, 3, 4, 5, 6];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_AR = ["الأَحَد", "الإِثْنَيْن", "الثُّلاثاء", "الأَرْبِعاء", "الخَمِيس", "الجُمْعَة", "السَّبْت"];
const DAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const GROUPS = [
  ["news", "News phases"],
  ["extensive", "Extensive reading"],
  ["cage", "Batting cage"],
  ["vocab", "Vocabulary"],
  ["prep", "Class prep"],
  ["other", "Other"],
];
const CATEGORIES = [
  ["agreement", "Gender & number agreement", "المُطابَقَة"],
  ["conjugation", "Verb conjugation", "التَّصْرِيف"],
  ["verbchoice", "Verb form & choice", "الأَوْزان"],
  ["prepositions", "Prepositions", "حُرُوف الجَرّ"],
  ["wordorder", "Word order & structure", "تَرْتِيب الجُمْلَة"],
  ["idafa", "Idafa & definiteness", "الإِضافَة وَالتَّعْرِيف"],
  ["case", "Case endings", "الإِعْراب"],
  ["tense", "Tense & aspect", "الزَّمَن"],
  ["conditionals", "Conditionals", "الشَّرْط"],
  ["relative", "Relative clauses", "الاِسْم المَوْصُول"],
  ["register", "Register mixing", "خَلْط المُسْتَوَيات"],
  ["vocab", "Word choice", "اِخْتِيار الكَلِمَة"],
  ["spelling", "Spelling & hamza", "الإِمْلاء وَالهَمْزَة"],
  ["other", "Other", "أُخْرَى"],
];
const CAT_IDS = CATEGORIES.map((c) => c[0]);
const catOf = (id) => CATEGORIES.find((c) => c[0] === id) || CATEGORIES[CATEGORIES.length - 1];
const VARIETIES = [
  { id: "msa", en: "Fusha", ar: "فُصْحَى" },
  { id: "shaami", en: "Shaami", ar: "شامي" },
  { id: "darija", en: "Darija", ar: "دارِجَة" },
];
const PROMPTS = [
  ["If you could live one year anywhere in the Arab world, where and why?", "Hypotheticals"],
  ["If you hadn't started Arabic, what would you be doing with your life right now?", "Hypotheticals"],
  ["If you could ask one prophet one question, who and what would you ask?", "Hypotheticals"],
  ["Compare life in Sweden with life in Utah. Which would you pick to raise a family?", "Comparison"],
  ["Compare how Swedes and Arabs show hospitality.", "Comparison"],
  ["Dialect first or Fusha first? Pick a side and defend it.", "Argumentation"],
  ["Should universities require a foreign language? Take a side.", "Argumentation"],
  ["Tell the story of the most chaotic day of your mission, start to finish.", "Past narration"],
  ["Narrate yesterday hour by hour. No skipping the boring parts.", "Past narration"],
  ["How did you first get hooked on Arabic? Tell it as a story.", "Past narration"],
  ["Describe your childhood home so well someone could draw it.", "Description"],
  ["Describe the people and sounds of a market you'd expect in Rabat.", "Description"],
];

const ALL_TASKS = () => [
  ...["A", "B", "C", "D"].map((l) => ({ id: "news-" + l, name: `${l} Day`, group: "news", days: ALL })),
  ...[1, 2, 3, 4, 5].map((n) => ({ id: "ext-" + n, name: `Extensive #${n}`, group: "extensive", days: ALL })),
  ...[1, 2].map((n) => ({ id: "cage-" + n, name: `Batting Cage #${n}`, group: "cage", days: ALL })),
  { id: "vocab", name: "Vocabulary", group: "vocab", days: ALL },
  { id: "issues", name: "Issues Class Prep", group: "prep", days: ALL },
  { id: "writepres", name: "Writing Presentation Prep", group: "prep", days: [1, 3] },
  { id: "speakpres", name: "Speaking Presentation Prep", group: "prep", days: [2, 5] },
];
const m = (text) => ({ id: uid(), text, done: false });
const freshState = () => ({
  version: 1,
  startDate: keyOf(new Date()),
  tasks: ALL_TASKS(),
  days: {},
  targets: [
    { id: "t-journal", name: "Journal entries", perWeek: 4, source: "journal" },
    { id: "t-darija", name: "Darija sessions", perWeek: 3, source: "manual" },
    { id: "t-read", name: "Free reading (not homework)", perWeek: 2, source: "manual" },
  ],
  objectives: [
    {
      id: "o-opi", name: "Turn OPI weak spots into strengths", date: "",
      milestones: [
        m("Hypotheticals (لَوْ… لَـ) come out without thinking"),
        m("Argue and compare for two minutes straight"),
        m("Past-tense narration on autopilot"),
        m("Describe a place or person in rich detail"),
      ],
    },
    {
      id: "o-rabat", name: "Functional Darija before Rabat", date: "",
      milestones: [m("Survive a taxi and market run in Darija"), m("Hold a 10-minute chat about myself"), m("Follow a Moroccan YouTuber at 70%")],
    },
  ],
  mistakes: [],
  migrated: { vocab: true },
});

/* ---------- helpers ---------- */
function uid() { return Math.random().toString(36).slice(2, 10); }
const pad = (n) => String(n).padStart(2, "0");
function keyOf(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
const parseKey = (k) => { const [y, mo, d] = k.split("-").map(Number); return new Date(y, mo - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const mondayOf = (d) => addDays(dayStart(d), -((d.getDay() + 6) % 7));
const wc = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const shortDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const ensureDay = (s, k) => {
  s.days[k] = s.days[k] || {};
  s.days[k].done = s.days[k].done || {};
  s.days[k].log = s.days[k].log || {};
  return s.days[k];
};

function ratioFor(state, d) {
  const dk = keyOf(d);
  const sched = state.tasks.filter((t) => t.days.includes(d.getDay()) && (!t.since || dk >= t.since));
  if (!sched.length) return null;
  const done = state.days[dk]?.done || {};
  return sched.filter((t) => done[t.id]).length / sched.length;
}
function computeStreak(state, now) {
  let d = dayStart(now);
  const start = parseKey(state.startDate);
  let n = ratioFor(state, d) === 1 ? 1 : 0;
  d = addDays(d, -1);
  for (let i = 0; i < 400 && d >= start; i++) {
    const r = ratioFor(state, d);
    if (r === null) { d = addDays(d, -1); continue; }
    if (r === 1) { n++; d = addDays(d, -1); } else break;
  }
  return n;
}
const SOURCES = [["manual", "Log manually"], ["journal", "Count journal entries"], ["gym", "Count Translation Gym sentences"], ["lab", "Count Text Lab texts"], ["cloze", "Count Word Bank cloze answers"]];
function weekCount(state, feeds, t, mon) {
  const end = addDays(mon, 7);
  if (t.source !== "manual" && feeds[t.source]) return feeds[t.source].filter((e) => { const d = parseKey(e.date); return d >= mon && d < end; }).length;
  let c = 0;
  for (let i = 0; i < 7; i++) c += state.days[keyOf(addDays(mon, i))]?.log?.[t.id] || 0;
  return c;
}
const emptyLife = (since) => ({
  since, gym: { n: 0, sum: 0, good: 0, byFocus: {} }, journal: { n: 0, words: 0 }, lab: { texts: 0, extracted: 0, queued: 0 },
  cloze: { n: 0, ok: 0 }, tasks: { checked: 0, perfect: {}, best: 0 }, mistakes: 0,
});
const ledger = (s) => (s.life = s.life || emptyLife(s.startDate));
const getLife = (s) => s.life || emptyLife(s.startDate);
function buildLife(st, journal, gym, lab, bank) {
  const L = emptyLife(st.startDate || keyOf(new Date()));
  ((gym && gym.history) || []).forEach((x) => {
    const sc = (x.result && x.result.score) || 0;
    L.gym.n++; L.gym.sum += sc; if (sc >= 4) L.gym.good++;
    const f = L.gym.byFocus[x.focus] || (L.gym.byFocus[x.focus] = { n: 0, sum: 0 });
    f.n++; f.sum += sc;
  });
  (journal || []).forEach((e) => { L.journal.n++; L.journal.words += e.words || 0; });
  const texts = (lab && lab.texts) || [];
  L.lab.texts = texts.length;
  L.lab.extracted = texts.reduce((a, t) => a + (t.words || []).length, 0);
  L.lab.queued = ((lab && lab.queue) || []).length;
  const log = (bank && bank.log) || [];
  L.cloze.n = log.length; L.cloze.ok = log.filter((x) => x.ok).length;
  L.mistakes = (st.mistakes || []).length;
  Object.values(st.days || {}).forEach((d) => { L.tasks.checked += Object.keys(d.done || {}).length; });
  const end = dayStart(new Date());
  let d = parseKey(st.startDate || keyOf(new Date())), run = 0;
  for (let i = 0; i < 1500 && d <= end; i++) {
    const r = ratioFor(st, d);
    if (r === 1) { L.tasks.perfect[keyOf(d)] = true; run++; L.tasks.best = Math.max(L.tasks.best, run); }
    else if (r !== null) run = 0;
    d = addDays(d, 1);
  }
  return L;
}
function paceOf(count, goal, now) {
  if (count >= goal) return ["done", "Hit"];
  const frac = (((now.getDay() + 6) % 7) + 1) / 7;
  return count >= Math.floor(goal * frac) ? ["on", "On pace"] : ["behind", "Behind pace"];
}

async function callClaudeRaw(system, content) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system, messages: [{ role: "user", content }] }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error("api");
  return (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n");
}
async function callClaude(system, prompt) {
  const text = await callClaudeRaw(system, prompt);
  const clean = text.replace(/```json|```/g, "").trim();
  const body = clean.slice(clean.indexOf("{"));
  try { return JSON.parse(body.slice(0, body.lastIndexOf("}") + 1)); } catch (e) {}
  // salvage a response that got cut off mid-list
  let i = body.lastIndexOf("}");
  while (i > 0) {
    for (const tail of ["]}", "}]}", "]}]}"]) { try { return JSON.parse(body.slice(0, i + 1) + tail); } catch (e) {} }
    i = body.lastIndexOf("}", i - 1);
  }
  throw new Error("parse");
}
const fbSystem = (v) => `You are a sharp, encouraging Arabic writing coach. The learner is intermediate-advanced and specifically wants to improve SENTENCE STRUCTURE (word order, clause linking, agreement, verb choice), not just vocabulary.
The entry is written in ${
  v === "msa"
    ? "Modern Standard Arabic (Fusha). Flag any dialect intrusions as register mixing."
    : v === "shaami"
    ? "Levantine (Shaami) colloquial Arabic. Correct it as natural Shaami. Do NOT convert it to Fusha."
    : "Moroccan Darija. Correct it as natural Darija. Do NOT convert it to Fusha. Only flag things you are confident about."
}
Return ONLY a JSON object, no preamble, no markdown fences:
{"overall":"1-2 sentences in English: the biggest structural takeaway",
"upgrade":{"original":"one sentence from the entry","better":"a more native, more sophisticated rewrite with full diacritics","why":"short English explanation"},
"corrections":[{"wrong":"exact snippet from the entry","right":"corrected snippet with full diacritics","category":"one of: ${CAT_IDS.join(", ")}","why":"short English explanation"}]}
Rules: at most 8 corrections, most important first. Keep snippets short (a few words). If the entry is clean, return an empty corrections array and still give an upgrade.`;

/* ---------- small pieces ---------- */
function Ring({ pct, size = 64, stroke = 7, color = "var(--maj)" }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .6s ease, stroke .3s" }} />
    </svg>
  );
}
function Pips({ count, goal }) {
  if (goal > 14) return <div className="bar"><div style={{ width: `${Math.min(1, count / goal) * 100}%` }} /></div>;
  return (
    <div className="pips">
      {Array.from({ length: goal }).map((_, i) => <span key={i} className={i < count ? "pip on" : "pip"} />)}
      {count > goal && <span className="extra">+{count - goal}</span>}
    </div>
  );
}
function History({ state, feeds, t, now }) {
  const mon = mondayOf(now);
  const weeks = Array.from({ length: 6 }).map((_, i) => addDays(mon, -7 * (5 - i)));
  return (
    <div className="hist" aria-label="Last six weeks">
      {weeks.map((w, i) => {
        const c = weekCount(state, feeds, t, w);
        const p = Math.min(1, c / t.perWeek);
        return (
          <div key={i} className="hist-col" title={`Week of ${shortDate(w)}: ${c}/${t.perWeek}`}>
            <div className="hist-bar"><div className={p >= 1 ? "full" : ""} style={{ height: `${Math.max(p, 0.04) * 100}%` }} /></div>
            <span>{i === 5 ? "now" : shortDate(w).split(" ")[1]}</span>
          </div>
        );
      })}
    </div>
  );
}
function TargetRow({ t, count, now, onInc, onDec, children }) {
  const [cls, label] = paceOf(count, t.perWeek, now);
  return (
    <div className="trow">
      <div className="trow-top">
        <span className="trow-name">{t.name}</span>
        <span className={"pill " + cls}>{label}</span>
      </div>
      <div className="trow-mid">
        <Pips count={count} goal={t.perWeek} />
        <span className="trow-num">{count}<span className="muted">/{t.perWeek}</span></span>
        {t.source === "journal" ? (
          <span className="auto" title="Counted automatically">auto</span>
        ) : (
          <span className="steppers">
            <button className="icon" onClick={onDec} aria-label={`Remove one ${t.name}`}><Minus size={14} /></button>
            <button className="icon inc" onClick={onInc} aria-label={`Log one ${t.name}`}><Plus size={14} /></button>
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ---------- Today ---------- */
function Heatmap({ state, now }) {
  const weeks = 18;
  const mon0 = addDays(mondayOf(now), -7 * (weeks - 1));
  const start = parseKey(state.startDate);
  const today = dayStart(now);
  return (
    <div className="hm-wrap">
      <div className="hm-days">{["Mon", "", "Wed", "", "Fri", "", "Sun"].map((x, i) => <span key={i}>{x}</span>)}</div>
      <div className="hm">
        {Array.from({ length: weeks }).map((_, w) => (
          <div key={w} className="hm-col">
            {Array.from({ length: 7 }).map((__, i) => {
              const d = addDays(mon0, w * 7 + i);
              let cls = "hm-cell", title = d.toDateString();
              if (d > today) cls += " fut";
              else if (d < start) cls += " pre";
              else {
                const r = ratioFor(state, d);
                if (r === null) cls += " off";
                else {
                  cls += " l" + (r === 0 ? 0 : r < 0.34 ? 1 : r < 0.67 ? 2 : r < 1 ? 3 : 4);
                  title += ` · ${Math.round(r * 100)}%`;
                }
              }
              if (+d === +today) cls += " now";
              return <div key={i} className={cls} title={title} />;
            })}
          </div>
        ))}
      </div>
      <div className="hm-legend"><span>Less</span>{[0, 1, 2, 3, 4].map((l) => <i key={l} className={"hm-cell l" + l} />)}<span>All done</span></div>
    </div>
  );
}

function ScheduleEditor({ state, upd }) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState("other");
  const add = () => {
    if (!name.trim()) return;
    upd((s) => { s.tasks.push({ id: uid(), name: name.trim(), group, days: [1, 2, 3, 4, 5], since: keyOf(new Date()) }); return s; });
    setName("");
  };
  return (
    <div className="sched">
      {state.tasks.map((t) => (
        <div key={t.id} className="sched-row">
          <span className="sched-name">{t.name}</span>
          <span className="daychips">
            {WEEK_ORDER.map((d) => (
              <button key={d} className={t.days.includes(d) ? "dchip on" : "dchip"} aria-pressed={t.days.includes(d)}
                onClick={() => upd((s) => { const x = s.tasks.find((y) => y.id === t.id); x.days = x.days.includes(d) ? x.days.filter((z) => z !== d) : [...x.days, d]; return s; })}>
                {DAY_SHORT[d]}
              </button>
            ))}
          </span>
          <button className="icon" aria-label={`Delete ${t.name}`} onClick={() => upd((s) => { s.tasks = s.tasks.filter((y) => y.id !== t.id); return s; })}><Trash2 size={14} /></button>
        </div>
      ))}
      <div className="addrow">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New homework item" onKeyDown={(e) => e.key === "Enter" && add()} />
        <select value={group} onChange={(e) => setGroup(e.target.value)}>{GROUPS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
        <button className="btn" onClick={add}><Plus size={14} /> Add</button>
      </div>
    </div>
  );
}

function Tile({ v, label, note }) {
  return <div><b>{v}</b><span>{label}</span>{note ? <em className="life">{note}</em> : null}</div>;
}
function LifetimeStrip({ life }) {
  const perfect = Object.keys(life.tasks.perfect || {}).length;
  const avg = life.gym.n ? (life.gym.sum / life.gym.n).toFixed(1) : "–";
  const acc = life.cloze.n ? Math.round((life.cloze.ok / life.cloze.n) * 100) + "%" : "–";
  return (
    <section className="panel">
      <h2>Lifetime</h2>
      <p className="hint">Tracking since {shortDate(parseKey(life.since))}. These only go up, even if you delete entries or old history rolls off.</p>
      <div className="stats">
        <Tile v={life.tasks.checked.toLocaleString()} label="required tasks checked off" />
        <Tile v={perfect} label="perfect days" />
        <Tile v={life.tasks.best} label="best streak (days)" />
        <Tile v={life.gym.n.toLocaleString()} label="sentences translated" note={life.gym.n ? `avg score ${avg}` : ""} />
        <Tile v={life.journal.n.toLocaleString()} label="journal entries" note={`${life.journal.words.toLocaleString()} words written`} />
        <Tile v={life.cloze.n.toLocaleString()} label="cloze answers" note={life.cloze.n ? `${acc} correct` : ""} />
        <Tile v={life.lab.texts.toLocaleString()} label="texts studied" note={`${life.lab.extracted.toLocaleString()} words mined`} />
        <Tile v={life.mistakes.toLocaleString()} label="mistakes logged" />
      </div>
    </section>
  );
}

function Today({ state, upd, feeds, now, goTo }) {
  const [editing, setEditing] = useState(false);
  const k = keyOf(now), wd = now.getDay();
  const sched = state.tasks.filter((t) => t.days.includes(wd));
  const done = state.days[k]?.done || {};
  const doneN = sched.filter((t) => done[t.id]).length;
  const pct = sched.length ? doneN / sched.length : 0;
  const complete = sched.length > 0 && doneN === sched.length;
  const streak = useMemo(() => computeStreak(state, now), [state, now]);
  const mon = mondayOf(now);
  const toggle = (id) => upd((s) => {
    const d = ensureDay(s, k), L = ledger(s);
    if (d.done[id]) { delete d.done[id]; L.tasks.checked = Math.max(0, L.tasks.checked - 1); }
    else { d.done[id] = true; L.tasks.checked++; }
    if (ratioFor(s, dayStart(now)) === 1) L.tasks.perfect[k] = true; else delete L.tasks.perfect[k];
    L.tasks.best = Math.max(L.tasks.best, computeStreak(s, now));
    return s;
  });
  const log = (id, delta) => upd((s) => { const d = ensureDay(s, k); d.log[id] = Math.max(0, (d.log[id] || 0) + delta); return s; });

  return (
    <>
      <section className="hero">
        <div>
          <div className="kufi hero-day" lang="ar">{DAY_AR[wd]}</div>
          <div className="hero-date">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
          <div className={complete ? "hero-status win" : "hero-status"}>
            {complete ? <><span className="ar" lang="ar">خَلَص!</span> Done for today.</> : sched.length ? `${doneN} of ${sched.length} required done` : "Nothing required today."}
          </div>
        </div>
        <div className="hero-right">
          <div className="ringbox">
            <Ring pct={pct} size={88} stroke={9} color={complete ? "var(--mint)" : "var(--maj)"} />
            <span>{Math.round(pct * 100)}%</span>
          </div>
          <div className="streak"><Flame size={20} /><b>{streak}</b><span>day streak</span><span>best {Math.max(getLife(state).tasks.best, streak)}</span></div>
        </div>
      </section>

      <div className="grid2">
        <section className="panel">
          <div className="panel-head">
            <div><h2>Required</h2><p className="hint">Resets every day. Your history stays on the heatmap.</p></div>
            <button className="btn ghost" onClick={() => setEditing(!editing)}><Settings2 size={14} /> {editing ? "Done editing" : "Edit schedule"}</button>
          </div>
          {editing ? <ScheduleEditor state={state} upd={upd} /> : (
            GROUPS.map(([gid, gl]) => {
              const items = sched.filter((t) => t.group === gid);
              if (!items.length) return null;
              const gd = items.filter((t) => done[t.id]).length;
              return (
                <div key={gid} className="group">
                  <div className="group-head"><span>{gl}</span><span className="muted">{gd}/{items.length}</span></div>
                  {items.map((t) => (
                    <button key={t.id} className={done[t.id] ? "task done" : "task"} onClick={() => toggle(t.id)} aria-pressed={!!done[t.id]}>
                      <span className="tick">{done[t.id] && <Check size={14} strokeWidth={3} />}</span>
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div><h2>Electives this week</h2><p className="hint">The stuff nobody's grading. Log it as you go.</p></div>
            <button className="btn ghost" onClick={() => goTo("path")}><PenLine size={14} /> Edit targets</button>
          </div>
          {state.targets.length === 0 && <p className="empty">Add weekly targets in Trajectory to track them here.</p>}
          {state.targets.map((t) => (
            <TargetRow key={t.id} t={t} now={now} count={weekCount(state, feeds, t, mon)} onInc={() => log(t.id, 1)} onDec={() => log(t.id, -1)} />
          ))}
        </section>
      </div>

      <section className="panel">
        <h2>Consistency</h2>
        <p className="hint">Each square is a day, shaded by how much required work got done.</p>
        <Heatmap state={state} now={now} />
      </section>
      <LifetimeStrip life={getLife(state)} />
    </>
  );
}

/* ---------- Trajectory ---------- */
function ObjectiveCard({ o, upd, now }) {
  const [newM, setNewM] = useState("");
  const [edit, setEdit] = useState(false);
  const doneN = o.milestones.filter((x) => x.done).length;
  const pct = o.milestones.length ? doneN / o.milestones.length : 0;
  const days = o.date ? Math.round((parseKey(o.date) - dayStart(now)) / 86400000) : null;
  const set = (fn) => upd((s) => { const x = s.objectives.find((y) => y.id === o.id); if (x) fn(x, s); return s; });
  const addM = () => { if (!newM.trim()) return; set((x) => x.milestones.push(m(newM.trim()))); setNewM(""); };
  return (
    <div className="obj">
      <div className="obj-head">
        <div className="ringbox small"><Ring pct={pct} size={60} stroke={6} color={pct === 1 ? "var(--mint)" : "var(--maj)"} /><span>{doneN}/{o.milestones.length}</span></div>
        <div className="obj-title">
          {edit ? <input className="big" value={o.name} onChange={(e) => set((x) => { x.name = e.target.value; })} /> : <h3>{o.name}</h3>}
          <div className="obj-meta">
            {edit ? (
              <label>Target date <input type="date" value={o.date} onChange={(e) => set((x) => { x.date = e.target.value; })} /></label>
            ) : (
              <span className={days !== null && days < 0 ? "count late" : "count"}>
                {days === null ? "No date set" : days > 0 ? `${days} days left` : days === 0 ? "Today" : `${-days} days past`}
              </span>
            )}
          </div>
        </div>
        <button className="btn ghost" onClick={() => setEdit(!edit)}>{edit ? "Done" : "Edit"}</button>
      </div>
      <div className="miles">
        {o.milestones.map((x) => (
          <div key={x.id} className={x.done ? "mile done" : "mile"}>
            <button className="tick" aria-pressed={x.done} aria-label="Toggle milestone" onClick={() => set((y) => { const z = y.milestones.find((q) => q.id === x.id); z.done = !z.done; })}>
              {x.done && <Check size={13} strokeWidth={3} />}
            </button>
            <span className="mile-text">{x.text}</span>
            {edit && <button className="icon" aria-label="Delete milestone" onClick={() => set((y) => { y.milestones = y.milestones.filter((q) => q.id !== x.id); })}><X size={14} /></button>}
          </div>
        ))}
        <div className="addrow">
          <input value={newM} onChange={(e) => setNewM(e.target.value)} placeholder="Add a milestone" onKeyDown={(e) => e.key === "Enter" && addM()} />
          <button className="btn ghost" onClick={addM}><Plus size={14} /></button>
        </div>
        {edit && <button className="btn danger" onClick={() => upd((s) => { s.objectives = s.objectives.filter((y) => y.id !== o.id); return s; })}><Trash2 size={14} /> Delete objective</button>}
      </div>
    </div>
  );
}

function Trajectory({ state, upd, feeds, now }) {
  const [name, setName] = useState("");
  const [num, setNum] = useState(3);
  const [src, setSrc] = useState("manual");
  const [editT, setEditT] = useState(null);
  const setTg = (id, fn) => upd((s) => { const x = s.targets.find((y) => y.id === id); if (x) fn(x); return s; });
  const move = (i, d) => upd((s) => { const a = s.targets; [a[i], a[i + d]] = [a[i + d], a[i]]; return s; });
  const mon = mondayOf(now);
  const k = keyOf(now);
  const addT = () => {
    if (!name.trim()) return;
    upd((s) => { s.targets.push({ id: uid(), name: name.trim(), perWeek: Math.max(1, +num || 1), source: src }); return s; });
    setName(""); setNum(3); setSrc("manual");
  };
  const log = (id, delta) => upd((s) => { const d = ensureDay(s, k); d.log[id] = Math.max(0, (d.log[id] || 0) + delta); return s; });
  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <div><h2>Long-range objectives</h2><p className="hint">Where you're headed. Milestones are the checkpoints on the way.</p></div>
          <button className="btn" onClick={() => upd((s) => { s.objectives.push({ id: uid(), name: "New objective", date: "", milestones: [] }); return s; })}><Plus size={14} /> Objective</button>
        </div>
        <div className="objs">{state.objectives.map((o) => <ObjectiveCard key={o.id} o={o} upd={upd} now={now} />)}</div>
        {state.objectives.length === 0 && <p className="empty">No objectives yet. Add the big thing you're aiming at.</p>}
      </section>

      <section className="panel">
        <h2>Weekly targets</h2>
        <p className="hint">Weeks run Monday to Sunday. Pace compares your count to how much of the week is gone.</p>
        <div className="targets">
          {state.targets.map((t, i) => (
            <TargetRow key={t.id} t={t} now={now} count={weekCount(state, feeds, t, mon)} onInc={() => log(t.id, 1)} onDec={() => log(t.id, -1)}>
              {editT === t.id ? (
                <div className="tedit">
                  <input value={t.name} aria-label="Target name" onChange={(e) => setTg(t.id, (x) => { x.name = e.target.value; })} />
                  <label className="inl">× <input type="number" min="1" value={t.perWeek} onChange={(e) => setTg(t.id, (x) => { x.perWeek = Math.max(1, +e.target.value || 1); })} /> per week</label>
                  <select value={t.source} onChange={(e) => setTg(t.id, (x) => { x.source = e.target.value; })}>{SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                  <span className="tedit-btns">
                    <button className="icon" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
                    <button className="icon" aria-label="Move down" disabled={i === state.targets.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
                    <button className="icon" aria-label={`Delete ${t.name}`} onClick={() => { upd((s) => { s.targets = s.targets.filter((y) => y.id !== t.id); return s; }); setEditT(null); }}><Trash2 size={14} /></button>
                    <button className="btn" onClick={() => setEditT(null)}>Done</button>
                  </span>
                </div>
              ) : (
                <div className="trow-foot">
                  <History state={state} feeds={feeds} t={t} now={now} />
                  <button className="btn ghost" onClick={() => setEditT(t.id)}><PenLine size={14} /> Edit</button>
                </div>
              )}
            </TargetRow>
          ))}
        </div>
        <div className="addrow wrap">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Target name, e.g. Podcast episodes" onKeyDown={(e) => e.key === "Enter" && addT()} />
          <label className="inl">× <input type="number" min="1" value={num} onChange={(e) => setNum(e.target.value)} /> per week</label>
          <select value={src} onChange={(e) => setSrc(e.target.value)}>{SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <button className="btn" onClick={addT}><Plus size={14} /> Add target</button>
        </div>
      </section>
    </>
  );
}

/* ---------- Journal ---------- */
function Feedback({ fb }) {
  return (
    <div className="fb">
      {fb.overall && <p className="fb-overall">{fb.overall}</p>}
      {fb.upgrade?.better && (
        <div className="fb-up">
          <div className="fb-label"><Sparkles size={14} /> Sentence upgrade</div>
          <p className="ar strike-soft" lang="ar">{fb.upgrade.original}</p>
          <p className="ar better" lang="ar">{fb.upgrade.better}</p>
          <p className="why">{fb.upgrade.why}</p>
        </div>
      )}
      {fb.corrections.length === 0 ? <p className="empty">No errors flagged. Suspicious, but congratulations.</p> : (
        <div className="corrs">
          {fb.corrections.map((c, i) => (
            <div key={i} className="corr">
              <span className="chip">{catOf(c.category)[1]}</span>
              <div className="corr-pair ar" lang="ar"><s>{c.wrong}</s><span className="arrow">←</span><b>{c.right}</b></div>
              <p className="why">{c.why}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Journal({ journal, setJournal, upd, now, bank, life }) {
  const [text, setText] = useState("");
  const [variety, setVariety] = useState("msa");
  const [prompt, setPrompt] = useState(null);
  const [sel, setSel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const jPool = poolFor(bank, variety).length;
  const drawChallenge = () => { if (jPool < 5) return; setChallenge(sample(poolFor(bank, variety), 5).map((w) => ({ ar: w.ar, en: w.en, used: false }))); };
  const selected = journal.find((e) => e.id === sel);
  const mon = mondayOf(now);
  const thisWeek = journal.filter((e) => parseKey(e.date) >= mon).length;
  const totalWords = journal.reduce((a, e) => a + e.words, 0);
  const recent = journal.slice(0, 10);
  const avg = recent.length ? Math.round(recent.reduce((a, e) => a + e.words, 0) / recent.length) : 0;

  const getFeedback = async (e) => {
    setBusy(true); setErr("");
    try {
      const entryText = e.challenge && e.challenge.length
        ? `${e.text}\n\n(Not part of the entry. The learner was challenged to use these words: ${e.challenge.map((c) => `${c.ar} = ${c.en}`).join("; ")}. If any were used incorrectly, mention it in "overall" and add a correction.)`
        : e.text;
      const fb = await callClaude(fbSystem(e.variety), entryText);
      const clean = { overall: fb.overall || "", upgrade: fb.upgrade || null, corrections: Array.isArray(fb.corrections) ? fb.corrections.slice(0, 8) : [] };
      setJournal((j) => j.map((x) => (x.id === e.id ? { ...x, feedback: clean } : x)));
      upd((s) => {
        s.mistakes = s.mistakes.filter((q) => q.sourceId !== e.id);
        if (!e.feedback) ledger(s).mistakes += clean.corrections.length;
        clean.corrections.forEach((c) => s.mistakes.push({
          id: uid(), date: e.date, source: "journal", sourceId: e.id,
          category: CAT_IDS.includes(c.category) ? c.category : "other", wrong: c.wrong || "", right: c.right || "", why: c.why || "",
        }));
        return s;
      });
    } catch (x) {
      setErr("Feedback didn't come back. Check your connection and try again.");
    }
    setBusy(false);
  };
  const save = async (withFb) => {
    if (!text.trim()) return;
    const e = { id: uid(), date: keyOf(now), ts: Date.now(), variety, prompt: prompt ? prompt[0] : "", text: text.trim(), words: wc(text), feedback: null, challenge: challenge || null };
    setJournal((j) => [e, ...j]);
    upd((s) => { const L = ledger(s); L.journal.n++; L.journal.words += e.words; return s; });
    setText(""); setPrompt(null); setChallenge(null); setSel(e.id); setConfirmDel(false);
    if (withFb) await getFeedback(e);
  };

  return (
    <>
      <div className="stats">
        <Tile v={journal.length} label="entries" note={`lifetime ${life.journal.n.toLocaleString()}`} />
        <Tile v={thisWeek} label="this week" />
        <Tile v={totalWords.toLocaleString()} label="words written" note={`lifetime ${life.journal.words.toLocaleString()}`} />
        <Tile v={avg} label="avg words, last 10" note={`lifetime avg ${life.journal.n ? Math.round(life.journal.words / life.journal.n) : 0}`} />
      </div>
      <div className="grid2">
        <section className="panel">
          <div className="panel-head">
            <h2 className="kufi" lang="ar">يَوْمِيّات</h2>
            <div className="seg" role="radiogroup" aria-label="Variety">
              {VARIETIES.map((v) => (
                <button key={v.id} role="radio" aria-checked={variety === v.id} className={variety === v.id ? "on" : ""} onClick={() => setVariety(v.id)}>
                  <span className="ar" lang="ar">{v.ar}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="promptbar">
            {prompt ? <p><span className="chip">{prompt[1]}</span> {prompt[0]}</p> : <p className="muted">Write about anything, or pull a prompt aimed at your weak spots.</p>}
            <button className="btn ghost" onClick={() => setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])}><Shuffle size={14} /> Prompt</button>
          </div>
          <div className="challenge">
            {challenge ? (
              <>
                <div className="ch-head">
                  <span className="muted small">Word challenge: tap each word once you've used it ({challenge.filter((c) => c.used).length}/{challenge.length})</span>
                  <button className="linkbtn" onClick={() => setChallenge(null)}>Clear</button>
                </div>
                <div className="ch-chips">
                  {challenge.map((c, i) => (
                    <button key={i} className={c.used ? "chw used" : "chw"} onClick={() => setChallenge((ch) => ch.map((x, j) => (j === i ? { ...x, used: !x.used } : x)))}>
                      <span className="ar" lang="ar">{c.ar}</span><span className="small">{c.en}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <button className="btn ghost" disabled={jPool < 5} onClick={drawChallenge} title={jPool < 5 ? "Not enough mastered words in this variety" : ""}>
                <Shuffle size={14} /> Word challenge (use 5 mastered words)
              </button>
            )}
          </div>
          <textarea className="ar editor" lang="ar" dir="rtl" value={text} onChange={(e) => setText(e.target.value)} placeholder="اُكْتُبْ هُنا…" />
          <div className="editor-foot">
            <span className="muted">{wc(text)} words</span>
            <span className="btns">
              <button className="btn ghost" disabled={!text.trim()} onClick={() => save(false)}>Save entry</button>
              <button className="btn" disabled={!text.trim() || busy} onClick={() => save(true)}><Sparkles size={14} /> Save and get feedback</button>
            </span>
          </div>
        </section>

        <section className="panel">
          {selected ? (
            <>
              <div className="panel-head">
                <button className="btn ghost" onClick={() => { setSel(null); setConfirmDel(false); }}>All entries</button>
                <span className="muted">{parseKey(selected.date).toDateString()} · {VARIETIES.find((v) => v.id === selected.variety)?.en} · {selected.words} words</span>
              </div>
              {selected.prompt && <p className="muted small">Prompt: {selected.prompt}</p>}
              {selected.challenge && <p className="muted small">Word challenge: {selected.challenge.filter((c) => c.used).length}/{selected.challenge.length} ticked. <span className="ar" lang="ar">{selected.challenge.map((c) => c.ar).join("، ")}</span></p>}
              <p className="ar entry-text" lang="ar">{selected.text}</p>
              {selected.feedback ? <Feedback fb={selected.feedback} /> : (
                <button className="btn" disabled={busy} onClick={() => getFeedback(selected)}><Sparkles size={14} /> Get feedback</button>
              )}
              {busy && <p className="muted">Reading your Arabic with a red pen…</p>}
              {err && <p className="err">{err}</p>}
              <div className="entry-actions">
                {selected.feedback && <button className="btn ghost" disabled={busy} onClick={() => getFeedback(selected)}>Re-run feedback</button>}
                {confirmDel ? (
                  <button className="btn danger" onClick={() => { setJournal((j) => j.filter((x) => x.id !== selected.id)); setSel(null); setConfirmDel(false); }}>Confirm delete</button>
                ) : (
                  <button className="btn ghost" onClick={() => setConfirmDel(true)}><Trash2 size={14} /> Delete</button>
                )}
              </div>
            </>
          ) : (
            <>
              <h2>Entries</h2>
              {journal.length === 0 && <p className="empty">Your first entry will show up here. Short counts.</p>}
              <div className="entries">
                {journal.map((e) => (
                  <button key={e.id} className="entry" onClick={() => setSel(e.id)}>
                    <span className="entry-meta">{shortDate(parseKey(e.date))} · {VARIETIES.find((v) => v.id === e.variety)?.en} · {e.words}w {e.feedback && <span className="dot" title="Has feedback" />}</span>
                    <span className="ar entry-snip" lang="ar">{e.text.slice(0, 90)}{e.text.length > 90 ? "…" : ""}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}

/* ---------- Translation Gym ---------- */
const FOCUSES = [
  ["hypo", "Hypotheticals (لَوْ… لَـ)"],
  ["compare", "Comparison"],
  ["argue", "Argumentation & opinion"],
  ["narr", "Past narration"],
  ["desc", "Description"],
  ["haal", "Haal clauses (الحال)"],
  ["relative", "Relative clauses"],
  ["passive", "Passive voice"],
  ["numbers", "Numbers & counting"],
  ["mixed", "Mixed bag"],
];
const LEVELS = [[1, "Everyday"], [2, "Intermediate"], [3, "Advanced"]];
const vName = (v) => (v === "msa" ? "Modern Standard Arabic (Fusha)" : v === "shaami" ? "Levantine (Shaami) colloquial Arabic" : "Moroccan Darija");
const LENGTHS = [1, 3, 5, 8];
const VOCAB_GEN_EXTRA = `\nVOCABULARY MODE: the user message includes a numbered list of words the learner has MASTERED. Build each sentence so that its natural translation uses 1 or 2 words from the list (different words in different sentences). Never mention the Arabic words in the English sentence or in the hint. The sentence must still require the target structure. Add "uses":[list numbers] to every item.`;
const genSystem = (focus, v, level, count) => `You write English sentences for an intermediate-advanced Arabic learner to translate into ${vName(v)}.
Target structure or skill: ${focus}.
Difficulty ${level} of 3 (1 = short everyday sentence, 2 = two clauses, 3 = multi-clause, formal or nuanced).
Sentences must sound natural and be high-frequency and useful: daily life, travel, culture, education, faith, work, opinions, missionary life, Morocco and the Levant. Design each so a correct translation genuinely REQUIRES the target structure. Vary topics and vocabulary.
Return ONLY JSON, no fences: {"items":[{"en":"English sentence","hint":"short structural hint in English naming the Arabic structure to use; never give the full answer"}]} with exactly ${count} item${count === 1 ? "" : "s"}.`;
const checkSystem = (v) => `You are a precise but encouraging Arabic coach grading a translation into ${vName(v)}. The learner is intermediate-advanced and is working specifically on SENTENCE STRUCTURE.
Judge meaning and structure. Accept any natural, correct translation and never penalize a valid alternative phrasing.${v === "msa" ? " Flag dialect intrusions as register mixing." : " Do not convert the answer to Fusha."}
Return ONLY JSON, no fences:
{"score":1-5 (5 = native-like, 4 = correct with minor issues, 3 = understandable with structural errors, 2 = major errors, 1 = off),
"verdict":"one short English sentence",
"model":"the best natural translation, full diacritics",
"alt":"optional second natural version with diacritics, or empty",
"structure":"1-2 English sentences on the key structure: what they did well or what was missing",
"corrections":[{"wrong":"exact snippet from the learner","right":"corrected snippet with diacritics","category":"one of: ${CAT_IDS.join(", ")}","why":"short English explanation"}]}
At most 6 corrections. Empty array if none.`;

function Score({ n }) {
  return (
    <span className="score" aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= n ? "on s" + n : ""} />)}
    </span>
  );
}
function CorrList({ items }) {
  return (
    <div className="corrs">
      {items.map((c, i) => (
        <div key={i} className="corr">
          <span className="chip">{catOf(c.category)[1]}</span>
          <div className="corr-pair ar" lang="ar"><s>{c.wrong}</s><span className="arrow">←</span><b>{c.right}</b></div>
          <p className="why">{c.why}</p>
        </div>
      ))}
    </div>
  );
}

function Gym({ gym, setGym, upd, now, drill, clearDrill, bank, life }) {
  const [focus, setFocus] = useState(gym.batch?.focus || { id: FOCUSES[0][0], label: FOCUSES[0][1] });
  const [variety, setVariety] = useState(gym.batch?.variety || "msa");
  const [level, setLevel] = useState(gym.batch?.level || 2);
  const [count, setCount] = useState(gym.batch?.count || 5);
  const [useWords, setUseWords] = useState(false);
  const poolN = poolFor(bank, variety).length;
  const wordsOn = useWords && poolN >= 3;
  const [attempt, setAttempt] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [openH, setOpenH] = useState(null);
  useEffect(() => { if (drill) { setFocus(drill); clearDrill(); } }, [drill]);

  const batch = gym.batch;
  const setDone = batch && batch.idx >= batch.items.length;
  const item = batch && !setDone ? batch.items[batch.idx] : null;
  const result = batch?.result || null;

  const newSet = async () => {
    setBusy("gen"); setErr(""); setAttempt(""); setShowHint(false);
    try {
      const recent = gym.history.slice(0, 15).map((h) => h.en);
      const picked = wordsOn ? sample(poolFor(bank, variety), Math.min(12, count * 2 + 4)) : [];
      const wordsBlock = picked.length ? `\n\nMASTERED VOCABULARY (numbered):\n${picked.map((w, i) => `${i + 1}. ${w.ar} = ${w.en}`).join("\n")}` : "";
      const r = await callClaude(genSystem(focus.label, variety, level, count) + (picked.length ? VOCAB_GEN_EXTRA : ""), `Avoid repeating these recent sentences:\n${recent.join("\n") || "(none)"}${wordsBlock}`);
      const items = (r.items || []).filter((x) => x && x.en).slice(0, count).map((x) => ({
        ...x, words: (Array.isArray(x.uses) ? x.uses : []).map((n) => picked[(+n) - 1]).filter(Boolean).map((w) => ({ ar: w.ar, en: w.en })),
      }));
      if (!items.length) throw new Error();
      setGym((g) => ({ ...g, batch: { items, idx: 0, focus, variety, level, count, result: null, done: 0 } }));
    } catch (e) { setErr("Couldn't generate sentences. Try again."); }
    setBusy("");
  };
  const check = async () => {
    if (!attempt.trim() || !item) return;
    setBusy("check"); setErr("");
    try {
      const r = await callClaude(checkSystem(batch.variety), `English: ${item.en}\nLearner's translation: ${attempt.trim()}${item.words && item.words.length ? `\nIntended vocabulary (not required, accept alternatives): ${item.words.map((w) => w.ar).join("، ")}` : ""}`);
      const res = {
        score: Math.max(1, Math.min(5, Math.round(+r.score) || 1)), verdict: r.verdict || "", model: r.model || "", alt: r.alt || "",
        structure: r.structure || "", corrections: Array.isArray(r.corrections) ? r.corrections.slice(0, 6) : [],
      };
      const h = { id: uid(), date: keyOf(now), focus: batch.focus.label, variety: batch.variety, en: item.en, attempt: attempt.trim(), result: res };
      setGym((g) => ({ ...g, history: [h, ...g.history].slice(0, 500), batch: { ...g.batch, result: res, attempt: attempt.trim(), done: (g.batch.done || 0) + 1 } }));
      upd((s) => {
        res.corrections.forEach((c) => s.mistakes.push({
          id: uid(), date: h.date, source: "gym", sourceId: h.id,
          category: CAT_IDS.includes(c.category) ? c.category : "other", wrong: c.wrong || "", right: c.right || "", why: c.why || "",
        }));
        const L = ledger(s);
        L.gym.n++; L.gym.sum += res.score; if (res.score >= 4) L.gym.good++;
        const f = L.gym.byFocus[batch.focus.label] || (L.gym.byFocus[batch.focus.label] = { n: 0, sum: 0 });
        f.n++; f.sum += res.score;
        L.mistakes += res.corrections.length;
        return s;
      });
    } catch (e) { setErr("Couldn't check that one. Try again."); }
    setBusy("");
  };
  const next = () => {
    setAttempt(""); setShowHint(false);
    setGym((g) => ({ ...g, batch: { ...g.batch, idx: g.batch.idx + 1, result: null, attempt: "" } }));
  };

  const mon = mondayOf(now);
  const week = gym.history.filter((h) => parseKey(h.date) >= mon).length;
  const last20 = gym.history.slice(0, 20);
  const avg = last20.length ? (last20.reduce((a, h) => a + h.result.score, 0) / last20.length).toFixed(1) : "–";
  const focusRows = Object.entries(life.gym.byFocus).sort((a, b) => b[1].n - a[1].n).slice(0, 8);
  const inList = FOCUSES.some((f) => f[0] === focus.id);
  const setAvg = setDone && batch.done ? (gym.history.slice(0, batch.done).reduce((a, h) => a + h.result.score, 0) / batch.done).toFixed(1) : null;

  return (
    <>
      <div className="stats">
        <Tile v={week} label="attempts this week" />
        <Tile v={avg} label="avg score, last 20" note={`lifetime ${life.gym.n ? (life.gym.sum / life.gym.n).toFixed(1) : "–"}`} />
        <Tile v={life.gym.n.toLocaleString()} label="sentences translated" note="all time" />
        <Tile v={life.gym.good.toLocaleString()} label="scored 4 or 5" note="all time" />
      </div>
      <div className="grid2">
        <section className="panel">
          <div className="panel-head">
            <h2 className="kufi" lang="ar">صالَة التَّرْجَمَة</h2>
            <div className="seg" role="radiogroup" aria-label="Variety">
              {VARIETIES.map((v) => (
                <button key={v.id} role="radio" aria-checked={variety === v.id} className={variety === v.id ? "on" : ""} onClick={() => setVariety(v.id)}>
                  <span className="ar" lang="ar">{v.ar}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="focuses">
            {!inList && <button className="fchip on">{focus.label}</button>}
            {FOCUSES.map(([id, l]) => <button key={id} className={focus.id === id ? "fchip on" : "fchip"} onClick={() => setFocus({ id, label: l })}>{l}</button>)}
          </div>
          <label className={poolN < 3 ? "usewords off" : "usewords"}>
            <input type="checkbox" checked={wordsOn} disabled={poolN < 3} onChange={(e) => setUseWords(e.target.checked)} />
            Build sentences from my mastered words <span className="muted small">({poolN} in the {VARIETIES.find((v) => v.id === variety)?.en} pool)</span>
          </label>
          <div className="gym-controls">
            <div className="seg" aria-label="Difficulty">
              {LEVELS.map(([n, l]) => <button key={n} className={level === n ? "on" : ""} onClick={() => setLevel(n)}>{l}</button>)}
            </div>
            <div className="seg" role="radiogroup" aria-label="Set length">
              {LENGTHS.map((n) => <button key={n} role="radio" aria-checked={count === n} className={count === n ? "on" : ""} onClick={() => setCount(n)}>{n === 1 ? "1 sentence" : n}</button>)}
            </div>
            <button className="btn" disabled={!!busy} onClick={newSet}><Shuffle size={14} /> {count === 1 ? "Give me a sentence" : batch ? `New set of ${count}` : `Start a set of ${count}`}</button>
          </div>
          {busy === "gen" && <p className="muted">Writing sentences designed to trip you up…</p>}
          {err && <p className="err">{err}</p>}

          {item && (
            <div className="card">
              <span className="muted small">{batch.items.length > 1 ? `${batch.idx + 1} of ${batch.items.length} · ` : ""}{batch.focus.label} · {VARIETIES.find((v) => v.id === batch.variety)?.en}</span>
              <p className="en-sent">{item.en}</p>
              {showHint ? <p className="hintline"><Lightbulb size={14} /> {item.hint}</p>
                : <button className="linkbtn" onClick={() => setShowHint(true)}><Lightbulb size={14} /> Show hint</button>}
              <textarea className="ar editor short" lang="ar" dir="rtl" value={result ? batch.attempt : attempt} disabled={!!result}
                onChange={(e) => setAttempt(e.target.value)} placeholder="تَرْجِمْ هُنا…" />
              {!result ? (
                <div className="editor-foot"><span />
                  <button className="btn" disabled={!attempt.trim() || !!busy} onClick={check}><Check size={14} /> Check</button>
                </div>
              ) : (
                <div className="gres">
                  <div className="gres-top"><Score n={result.score} /><span>{result.verdict}</span></div>
                  <p className="ar model" lang="ar">{result.model}</p>
                  {item.words && item.words.length > 0 && (
                    <div className="wip"><span className="muted small">Words in play</span>
                      {item.words.map((w, i) => <span key={i} className="wchip"><span className="ar" lang="ar">{w.ar}</span><span className="muted">{w.en}</span></span>)}
                    </div>
                  )}
                  {result.alt && <p className="ar alt" lang="ar">{result.alt}</p>}
                  {result.structure && <p className="fb-overall">{result.structure}</p>}
                  {result.corrections.length > 0 && <CorrList items={result.corrections} />}
                  <div className="editor-foot"><span />
                    <button className="btn" onClick={next}>{batch.idx + 1 < batch.items.length ? "Next sentence" : batch.items.length === 1 ? "Done" : "Finish set"}</button>
                  </div>
                </div>
              )}
              {busy === "check" && <p className="muted">Grading…</p>}
            </div>
          )}
          {setDone && (
            <div className="card done-card">
              <p className="kufi big-ar" lang="ar">أَحْسَنْت!</p>
              <p>{batch.items.length === 1 ? "Sentence done" : "Set complete"}{setAvg ? `, ${batch.items.length === 1 ? "scored" : "averaging"} ${setAvg}` : ""}. Run another or switch the focus.</p>
            </div>
          )}
          {!batch && busy !== "gen" && <p className="empty">Pick a focus, a variety, and a difficulty, then start a set. Choose one sentence or a set of up to 8, all built around one structure.</p>}
        </section>

        <section className="panel">
          <h2>By focus</h2>
          <p className="hint">Lifetime average score per structure. The short bars are your homework.</p>
          {focusRows.length === 0 && <p className="empty">Scores show up after your first set.</p>}
          {focusRows.map(([f, v]) => (
            <div key={f} className="frow">
              <span>{f}</span>
              <div className="bar"><div style={{ width: `${(v.sum / v.n / 5) * 100}%`, background: v.sum / v.n >= 4 ? "var(--mint)" : v.sum / v.n >= 3 ? "var(--saf)" : "var(--rose)" }} /></div>
              <span className="muted small">{(v.sum / v.n).toFixed(1)} · {v.n}</span>
            </div>
          ))}
          <h2 className="gap-top">Recent</h2>
          <div className="entries">
            {gym.history.slice(0, 12).map((h) => (
              <button key={h.id} className="entry" onClick={() => setOpenH(openH === h.id ? null : h.id)} aria-expanded={openH === h.id}>
                <span className="entry-meta"><Score n={h.result.score} /> {h.focus} · {shortDate(parseKey(h.date))}</span>
                <span>{h.en}</span>
                {openH === h.id && (
                  <>
                    <span className="ar entry-snip muted" lang="ar">{h.attempt}</span>
                    <span className="ar entry-snip" lang="ar">{h.result.model}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

/* ---------- Text Lab ---------- */
const KINDS = ["News", "Story", "Scripture", "Social media", "Essay", "Other"];
const VLABEL = { fusha: "MSA", shaami: "Shaami", darija: "Darija", both: "MSA + Shaami" };
const VOCAB_SYSTEM = `You are an Arabic lexicographer helping an intermediate-advanced learner mine vocabulary from a real text.
Pick up to 8 words MOST worth learning: skip basic words (كان، في، هذا، قال and similar) and proper names; favor words that are high-frequency in news, formal writing, or everyday speech that this learner likely doesn't know yet.
Always use full diacritics on Arabic. Return ONLY JSON, no fences:
{"gist":"one English sentence summarizing the text",
"words":[{"inText":"the word exactly as it appears in the text",
"ar":"dictionary form with full diacritics (noun: singular; verb: past 3ms; adjective: masculine singular)",
"en":"concise meaning",
"pos":"noun|verb|adjective|other",
"variety":"fusha|shaami|darija|both (both = same in Fusha and Shaami)",
"plural":"nouns only: plural(s) with diacritics, else empty",
"form":"verbs only: form number I-X, else empty",
"present":"verbs only: 3ms present with diacritics, else empty",
"fem":"adjectives only: feminine ONLY if irregular, else empty",
"adjPlural":"adjectives only: plural ONLY if irregular, else empty",
"levantine":"if the word is Fusha-only, the everyday Shaami equivalent with diacritics, else empty",
"example":"short high-frequency example sentence with diacritics"}]}`;
const Q_SYSTEM = `Write 4 comprehension questions about the text for an intermediate-advanced Arabic learner, progressing from gist to detail to inference. Questions 1 and 3 in Arabic (Fusha, full diacritics), questions 2 and 4 in English. Return ONLY JSON, no fences: {"questions":[{"q":"question","lang":"ar|en","key":"concise model answer in the same language as the question"}]}`;
const GRADE_SYSTEM = `You grade an intermediate-advanced learner's answers to reading comprehension questions against answer keys. Be fair: accept answers that capture the key idea in different words, and do not penalize minor language errors unless they change the meaning. Return ONLY JSON, no fences: {"results":[{"mark":"yes|partly|no","note":"one short English sentence of feedback"}],"overall":"one English sentence"}`;
const BREAK_SYSTEM = `Explain an Arabic sentence to an intermediate-advanced learner who is working on sentence structure. Return ONLY JSON, no fences:
{"diacritized":"the sentence with full diacritics","translation":"natural English","literal":"word-by-word English gloss","structure":[{"part":"Arabic chunk from the sentence","role":"its grammatical role and function, briefly, in English"}],"note":"one structural observation worth remembering"}
At most 8 structure chunks.`;

const OCR_SYSTEM = `You transcribe Arabic text from screenshots of articles, posts, and pages.
Transcribe the main body text EXACTLY as written: same spelling, same punctuation, and do not add diacritics that aren't in the image. Do not translate, summarize, or correct anything.
Skip interface clutter: navigation, timestamps, share buttons, ads, captions of unrelated images, "read also" links, and comment sections.
Keep paragraph breaks.
Output format, nothing else:
TITLE: <the headline if one is visible, otherwise none>
---
<the transcribed text>`;
function imageToJpegB64(file, maxSide = 2000) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85).split(",")[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}
async function transcribeImage(file) {
  const data = await imageToJpegB64(file);
  const out = await callClaudeRaw(OCR_SYSTEM, [
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data } },
    { type: "text", text: "Transcribe this screenshot." },
  ]);
  const cut = out.indexOf("---");
  const head = cut >= 0 ? out.slice(0, cut) : "";
  const body = (cut >= 0 ? out.slice(cut + 3) : out).trim();
  const m = head.match(/TITLE:\s*(.+)/);
  const title = m && !/^none$/i.test(m[1].trim()) ? m[1].trim() : "";
  return { title, text: body };
}

function Highlighted({ text, words }) {
  const toks = [...new Set(words.map((w) => w.inText).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!toks.length) return <>{text}</>;
  const re = new RegExp("(" + toks.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "g");
  return <>{text.split(re).map((p, i) => (toks.includes(p) ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>))}</>;
}
function VocabCard({ w, queued, onQueue, known }) {
  const v = w.variety || "fusha";
  return (
    <div className="vcard">
      <div className="vtop">
        <span className={"vbadge " + v}>{VLABEL[v] || "MSA"}</span>
        {known && <span className="vbadge known" title="Already in your Mufradaati mastered box">Mastered</span>}
        <button className={queued ? "icon qd" : "icon"} onClick={onQueue} disabled={queued} aria-label={queued ? "Queued for Mufradaati" : "Queue for Mufradaati"}>
          {queued ? <Check size={14} /> : <Plus size={14} />}
        </button>
        <span className="ar vword" lang="ar">{w.ar}</span>
      </div>
      <div className="vmean">{w.en} <span className="muted small">{w.pos}</span></div>
      <div className="vgram">
        {w.pos === "noun" && w.plural && <span>pl. <span className="ar" lang="ar">{w.plural}</span></span>}
        {w.pos === "verb" && <span>Form {w.form} · <span className="ar" lang="ar">{w.ar}</span> / <span className="ar" lang="ar">{w.present}</span></span>}
        {w.pos === "adjective" && w.fem && <span>f. <span className="ar" lang="ar">{w.fem}</span></span>}
        {w.pos === "adjective" && w.adjPlural && <span>pl. <span className="ar" lang="ar">{w.adjPlural}</span></span>}
        {w.levantine && <span>Shaami: <span className="ar" lang="ar">{w.levantine}</span></span>}
      </div>
      {w.example && <p className="ar vex" lang="ar">{w.example}</p>}
    </div>
  );
}

function Lab({ lab, setLab, now, bankSet, upd, life }) {
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState({ title: "", kind: "News", variety: "msa", text: "" });
  const [sub, setSub] = useState("vocab");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [sentence, setSentence] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [copied, setCopied] = useState("");
  const [ocr, setOcr] = useState(null);
  const [ocrErr, setOcrErr] = useState("");
  const t = lab.texts.find((x) => x.id === sel);
  const processImages = async (files) => {
    const imgs = [...files].filter((f) => f && f.type && f.type.startsWith("image/"));
    if (!imgs.length || ocr) return;
    setOcrErr("");
    let failed = 0;
    for (let i = 0; i < imgs.length; i++) {
      setOcr({ done: i, total: imgs.length });
      try {
        const { title, text } = await transcribeImage(imgs[i]);
        setForm((f) => ({
          ...f,
          title: f.title || title,
          text: f.text.trim() ? f.text.trim() + "\n\n" + text : text,
        }));
      } catch (e) { failed++; }
    }
    setOcr(null);
    if (failed) setOcrErr(`${failed} of ${imgs.length} screenshot${imgs.length === 1 ? "" : "s"} couldn't be read. Try again, or crop it tighter.`);
  };
  const setTxt = (id, fn) => setLab((l) => ({ ...l, texts: l.texts.map((x) => (x.id === id ? fn({ ...x }) : x)) }));
  const run = async (kind, fn) => { setBusy(kind); setErr(""); try { await fn(); } catch (e) { setErr("That didn't come back cleanly. Try again."); } setBusy(""); };

  const create = () => {
    if (!form.text.trim()) return;
    const x = { id: uid(), date: keyOf(now), title: form.title.trim() || "Untitled text", kind: form.kind, variety: form.variety, text: form.text.trim(), gist: "", words: [], questions: [], answers: {}, grades: null, breakdowns: [] };
    setLab((l) => ({ ...l, texts: [x, ...l.texts] }));
    upd((s) => { ledger(s).lab.texts++; return s; });
    setForm({ title: "", kind: form.kind, variety: form.variety, text: "" });
    setSel(x.id); setSub("vocab"); setConfirmDel(false);
  };
  const extract = (x) => run("vocab", async () => {
    const known = x.words.map((w) => w.ar).join("، ");
    const r = await callClaude(VOCAB_SYSTEM, `${known ? `Already extracted, do NOT repeat: ${known}\n\n` : ""}TEXT (${x.kind}):\n${x.text.slice(0, 12000)}`);
    const words = (r.words || []).filter((w) => w && w.ar).map((w) => ({ ...w, id: uid() }));
    if (!words.length) throw new Error();
    setTxt(x.id, (y) => ({ ...y, gist: y.gist || r.gist || "", words: [...y.words, ...words] }));
    upd((s) => { ledger(s).lab.extracted += words.length; return s; });
  });
  const makeQs = (x) => run("qs", async () => {
    const r = await callClaude(Q_SYSTEM, x.text.slice(0, 12000));
    const qs = (r.questions || []).filter((q) => q && q.q).slice(0, 4);
    if (!qs.length) throw new Error();
    setTxt(x.id, (y) => ({ ...y, questions: qs, answers: {}, grades: null }));
  });
  const grade = (x) => run("grade", async () => {
    const payload = x.questions.map((q, i) => `Q${i + 1}: ${q.q}\nKey: ${q.key}\nLearner: ${x.answers[i] || "(blank)"}`).join("\n\n");
    const r = await callClaude(GRADE_SYSTEM, payload);
    setTxt(x.id, (y) => ({ ...y, grades: { results: r.results || [], overall: r.overall || "" } }));
  });
  const breakdown = (x) => run("break", async () => {
    const s = sentence.trim();
    if (!s) return;
    const r = await callClaude(BREAK_SYSTEM, s);
    setTxt(x.id, (y) => ({ ...y, breakdowns: [{ id: uid(), s, ...r }, ...y.breakdowns] }));
    setSentence("");
  });

  const qKey = (w) => w.ar + "|" + (w.dialect || w.variety || "fusha");
  const queued = new Set(lab.queue.map(qKey));
  const queue = (ws, x) => {
    const have0 = new Set(lab.queue.map(qKey));
    const n = new Set(ws.filter((w) => !have0.has(qKey(w))).map(qKey)).size;
    if (n) upd((s) => { ledger(s).lab.queued += n; return s; });
    queueRaw(ws, x);
  };
  const queueRaw = (ws, x) => setLab((l) => {
    const have = new Set(l.queue.map(qKey));
    const add = ws.filter((w) => !have.has(qKey(w))).map((w) => ({
      ar: w.ar, en: w.en || "", pos: w.pos || "other", dialect: w.variety || "fusha", plural: w.plural || "", verbForm: w.form || "",
      present: w.present || "", feminine: w.fem || "", adjPlural: w.adjPlural || "", levantine: w.levantine || "", example: w.example || "",
      source: x.title, added: keyOf(now),
    }));
    return { ...l, queue: [...l.queue, ...add] };
  });
  const exportJson = JSON.stringify({ format: "mufradaati-import-v1", exported: new Date().toISOString(), words: lab.queue }, null, 2);

  return (
    <>
      {t ? (
        <>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>{t.title}</h2>
                <p className="hint">{t.kind} · {VARIETIES.find((v) => v.id === t.variety)?.en} · added {shortDate(parseKey(t.date))} · {wc(t.text)} words</p>
              </div>
              <span className="btns">
                <button className="btn ghost" onClick={() => { setSel(null); setConfirmDel(false); setErr(""); }}>All texts</button>
                {confirmDel ? (
                  <button className="btn danger" onClick={() => { setLab((l) => ({ ...l, texts: l.texts.filter((y) => y.id !== t.id) })); setSel(null); setConfirmDel(false); }}>Confirm delete</button>
                ) : (
                  <button className="btn ghost" aria-label="Delete text" onClick={() => setConfirmDel(true)}><Trash2 size={14} /></button>
                )}
              </span>
            </div>
            {t.gist && <p className="fb-overall">{t.gist}</p>}
          </section>
          <div className="grid2 lab-grid">
            <section className="panel"><div className="ar reader" lang="ar"><Highlighted text={t.text} words={t.words} /></div></section>
            <section className="panel">
              <div className="seg subtabs">
                {[["vocab", "Vocab"], ["qs", "Comprehension"], ["break", "Break down"]].map(([id, l]) => (
                  <button key={id} className={sub === id ? "on" : ""} onClick={() => { setSub(id); setErr(""); }}>{l}</button>
                ))}
              </div>
              {err && <p className="err">{err}</p>}

              {sub === "vocab" && (
                <div>
                  {t.words.length === 0 ? (
                    <p className="empty">Pull out the words worth learning. They come in your usual format, ready to queue for Mufradaati.</p>
                  ) : (
                    <div className="vhead"><span className="muted small">{t.words.length} words</span>
                      <button className="btn ghost" onClick={() => queue(t.words, t)}><ListPlus size={14} /> Queue all</button>
                    </div>
                  )}
                  <div className="vlist">{t.words.map((w) => <VocabCard key={w.id} w={w} queued={queued.has(qKey(w))} known={bankSet.has(nrm(String(w.ar).split(/[,،]/)[0]))} onQueue={() => queue([w], t)} />)}</div>
                  <button className="btn" disabled={!!busy} onClick={() => extract(t)}><Sparkles size={14} /> {t.words.length ? "Extract 8 more" : "Extract vocab"}</button>
                  {busy === "vocab" && <p className="muted">Mining the text…</p>}
                </div>
              )}

              {sub === "qs" && (
                <div>
                  {t.questions.length === 0 ? (
                    <p className="empty">Four questions, from the gist down to inference. Half in Arabic, half in English.</p>
                  ) : t.questions.map((q, i) => {
                    const g = t.grades?.results?.[i];
                    const ar = q.lang === "ar";
                    return (
                      <div key={i} className="qa">
                        <p className={ar ? "ar q" : "q"} lang={ar ? "ar" : "en"}>{i + 1}. {q.q}</p>
                        <textarea className={ar ? "ar ans" : "ans"} dir={ar ? "rtl" : "ltr"} value={t.answers[i] || ""}
                          onChange={(e) => { const val = e.target.value; setTxt(t.id, (y) => ({ ...y, answers: { ...y.answers, [i]: val } })); }} />
                        {g && (
                          <div className={"grade " + g.mark}>
                            <b>{g.mark === "yes" ? "Correct." : g.mark === "partly" ? "Partly." : "Not quite."}</b> {g.note}
                            <p className={ar ? "ar key" : "key"}>Key: {q.key}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {t.grades?.overall && <p className="fb-overall">{t.grades.overall}</p>}
                  <span className="btns">
                    <button className={t.questions.length ? "btn ghost" : "btn"} disabled={!!busy} onClick={() => makeQs(t)}>{t.questions.length ? "New questions" : "Generate questions"}</button>
                    {t.questions.length > 0 && <button className="btn" disabled={!!busy} onClick={() => grade(t)}><Check size={14} /> Check answers</button>}
                  </span>
                  {(busy === "qs" || busy === "grade") && <p className="muted">Working on it…</p>}
                </div>
              )}

              {sub === "break" && (
                <div>
                  <p className="hint">Paste a sentence from the text that's giving you trouble.</p>
                  <textarea className="ar editor short" lang="ar" dir="rtl" value={sentence} onChange={(e) => setSentence(e.target.value)} placeholder="اِلْصَقِ الجُمْلَةَ هُنا…" />
                  <div className="editor-foot"><span />
                    <button className="btn" disabled={!sentence.trim() || !!busy} onClick={() => breakdown(t)}>Break it down</button>
                  </div>
                  {busy === "break" && <p className="muted">Taking it apart…</p>}
                  {t.breakdowns.map((b) => (
                    <div key={b.id} className="bd">
                      <p className="ar model" lang="ar">{b.diacritized || b.s}</p>
                      <p className="bd-tr">{b.translation}</p>
                      {b.literal && <p className="why">Literally: {b.literal}</p>}
                      {Array.isArray(b.structure) && (
                        <div className="bd-rows">
                          {b.structure.map((p, i) => <div key={i} className="bd-row"><span className="ar" lang="ar">{p.part}</span><span>{p.role}</span></div>)}
                        </div>
                      )}
                      {b.note && <p className="fb-overall">{b.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : (
        <div className="grid2">
          <section className="panel" onPaste={(e) => {
            const files = [...(e.clipboardData?.items || [])].filter((it) => it.type.startsWith("image/")).map((it) => it.getAsFile());
            if (files.length) { e.preventDefault(); processImages(files); }
          }}>
            <h2 className="kufi" lang="ar">المُخْتَبَر</h2>
            <p className="hint">Paste any Arabic text: news, a story, scripture, a post. Or upload screenshots and it'll transcribe them. Mine it, test yourself on it, and take apart the sentences that confuse you.</p>
            <input className="full" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title (optional)" />
            <div className="labopts">
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
              <div className="seg" role="radiogroup" aria-label="Variety">
                {VARIETIES.map((v) => (
                  <button key={v.id} role="radio" aria-checked={form.variety === v.id} className={form.variety === v.id ? "on" : ""} onClick={() => setForm({ ...form, variety: v.id })}>
                    <span className="ar" lang="ar">{v.ar}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="shotbar">
              <label className={ocr ? "btn ghost disabled" : "btn ghost"}>
                <ImagePlus size={14} /> Upload screenshots
                <input type="file" accept="image/*" multiple hidden disabled={!!ocr} onChange={(e) => { processImages(e.target.files); e.target.value = ""; }} />
              </label>
              <span className="muted small">
                {ocr ? `Transcribing ${ocr.done + 1} of ${ocr.total}…` : "Pick them in reading order. On desktop you can also paste a screenshot straight in."}
              </span>
            </div>
            {ocrErr && <p className="err small">{ocrErr}</p>}
            <textarea className="ar editor" lang="ar" dir="rtl" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="اِلْصَقِ النَّصَّ هُنا…" />
            {form.text && !ocr && <p className="muted small">Check the transcription before adding. Tiny fonts can fool it.</p>}
            <div className="editor-foot"><span className="muted">{wc(form.text)} words</span>
              <button className="btn" disabled={!form.text.trim() || !!ocr} onClick={create}>Add to lab</button>
            </div>
          </section>
          <section className="panel">
            <h2>Library</h2>
            <p className="hint">Lifetime: {life.lab.texts} texts added, {life.lab.extracted} words mined, {life.lab.queued} queued for Mufradaati.</p>
            {lab.texts.length === 0 && <p className="empty">Texts you add live here, along with their vocab, questions, and breakdowns.</p>}
            <div className="entries">
              {lab.texts.map((x) => (
                <button key={x.id} className="entry" onClick={() => { setSel(x.id); setSub("vocab"); setErr(""); }}>
                  <span className="entry-meta">{shortDate(parseKey(x.date))} · {x.kind} · {x.words.length} words mined</span>
                  <span className="entry-title">{x.title}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Mufradaati queue</h2>
            <p className="hint">{lab.queue.length} word{lab.queue.length === 1 ? "" : "s"} waiting. Copy the export and paste it into Mufradaati's import.</p>
          </div>
          <span className="btns">
            <button className="btn" disabled={!lab.queue.length}
              onClick={() => { navigator.clipboard?.writeText(exportJson).then(() => setCopied("Copied."), () => setCopied("Open the export text below and copy it manually.")); }}>
              <Copy size={14} /> Copy export
            </button>
            <button className="btn ghost" disabled={!lab.queue.length} onClick={() => { setLab((l) => ({ ...l, queue: [] })); setCopied(""); }}>Clear queue</button>
          </span>
        </div>
        {copied && <p className="muted small">{copied}</p>}
        {lab.queue.length > 0 && (
          <div className="qchips">
            {lab.queue.map((w, i) => (
              <span key={i} className="qchip">
                <span className="ar" lang="ar">{w.ar}</span>
                <button aria-label={`Remove ${w.ar}`} onClick={() => setLab((l) => ({ ...l, queue: l.queue.filter((_, j) => j !== i) }))}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
        {lab.queue.length > 0 && (
          <details>
            <summary className="muted small">Show export text</summary>
            <textarea className="exporttext" readOnly value={exportJson} onFocus={(e) => e.target.select()} />
          </details>
        )}
      </section>
    </>
  );
}

/* ---------- Word Bank ---------- */
// LOGIC-START
const nrm = (t) => String(t || "")
  .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
  .replace(/[إأآٱ]/g, "ا")
  .replace(/ى/g, "ي")
  .replace(/ة/g, "ه")
  .replace(/[.,،؟?!؛:«»"'()\[\]…—–]/g, " ")
  .replace(/\s+/g, " ")
  .trim();
const MUF_POOL = { msa: ["MSA", "Universal"], shaami: ["Shaami", "Universal"], darija: ["Darija", "Universal"] };
const poolFor = (bank, variety) => (bank && bank.words ? bank.words.filter((w) => (MUF_POOL[variety] || []).includes(w.dia)) : []);
function sample(arr, n) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}
function parseMuf(text) {
  const d = JSON.parse(text);
  const words = d["muf-words"], boxes = d["muf-boxes"];
  if (!Array.isArray(words) || !boxes || !Array.isArray(boxes.mastered)) throw new Error("shape");
  const byId = new Map(words.map((w) => [w.id, w]));
  const out = [];
  for (const id of boxes.mastered) {
    const w = byId.get(id);
    if (!w || !w.arabic || !String(w.arabic).trim()) continue;
    out.push({
      id: w.id, ar: String(w.arabic).trim(), en: String(w.english || "").trim(), ex: String(w.example || ""),
      type: w.wordType || "Other", dia: w.dialect || "MSA", forms: w.forms && Object.keys(w.forms).length ? w.forms : null,
    });
  }
  return { words: out, total: words.length };
}
function findBlank(w) {
  if (!w.ex) return null;
  const m = w.ex.match(/^([\s\S]*?)\s+[—–]\s+([\s\S]*)$/);
  const sent = (m ? m[1] : w.ex).trim();
  const eng = m ? m[2].trim() : "";
  const tokens = sent.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return null;
  const variants = [...new Set([w.ar, ...Object.values(w.forms || {})]
    .flatMap((v) => String(v).split(/[,،\/]/))
    .map(nrm).filter((v) => v.length >= 2))];
  const clean = tokens.map(nrm);
  for (const v of variants) {
    const k = v.split(" ").length;
    const re = new RegExp("^[وفبلك]?(?:ال)?" + v + "(?:ها|هم|هن|كم|ني|نا|ان|ين|ون|ات|وا|ه|ك|ي|ت)?$");
    for (let i = 0; i + k <= tokens.length; i++) {
      const joined = clean.slice(i, i + k).join(" ");
      if (!re.test(joined)) continue;
      const last = tokens[i + k - 1];
      const punct = (last.match(/[.,،؟?!؛:]+$/) || [""])[0];
      const shown = tokens.slice(i, i + k).join(" ").replace(/[.,،؟?!؛:]+$/, "");
      const accepted = [...new Set([joined, v, "ال" + v, joined.replace(/^ال/, "")])];
      return { before: tokens.slice(0, i).join(" "), after: tokens.slice(i + k).join(" "), shown, punct, eng, accepted };
    }
  }
  return null;
}
// LOGIC-END

const DIA_CLS = { Darija: "darija", Shaami: "shaami", Universal: "both" };
const formsLine = (w) => Object.values(w.forms || {}).map((v) => String(v)).filter((v) => v && v !== w.ar).join(" · ");
const tally = (arr, key) => {
  const o = {};
  arr.forEach((x) => { o[x[key]] = (o[x[key]] || 0) + 1; });
  return Object.entries(o).sort((a, b) => b[1] - a[1]);
};

function Cloze({ bank, setBank, now, upd }) {
  const pool = useMemo(() => bank.words.map((w) => ({ w, b: findBlank(w) })).filter((x) => x.b), [bank.words]);
  const [dia, setDia] = useState("all");
  const [cur, setCur] = useState(null);
  const [ans, setAns] = useState("");
  const [status, setStatus] = useState(null);
  const [showMean, setShowMean] = useState(false);
  const [sess, setSess] = useState({ n: 0, ok: 0 });
  const dias = tally(pool.map((x) => ({ d: x.w.dia })), "d");
  const filtered = dia === "all" ? pool : pool.filter((x) => x.w.dia === dia);

  const draw = (list, prev) => {
    if (!list.length) { setCur(null); return; }
    let c = list[0];
    for (let t = 0; t < 6; t++) { c = list[Math.floor(Math.random() * list.length)]; if (!prev || c.w.id !== prev.w.id) break; }
    setCur(c); setAns(""); setStatus(null); setShowMean(false);
  };
  useEffect(() => { draw(filtered, null); }, [dia, pool.length]);

  const log = (ok) => {
    setBank((b) => ({ ...b, log: [...(b.log || []), { date: keyOf(now), ok }].slice(-3000) }));
    upd((s) => { const L = ledger(s); L.cloze.n++; if (ok) L.cloze.ok++; return s; });
  };
  const check = () => {
    if (status || !cur) return;
    const a = nrm(ans);
    if (!a) return;
    const ok = cur.b.accepted.includes(a);
    setStatus(ok ? "right" : "wrong");
    setSess((s) => ({ n: s.n + 1, ok: s.ok + (ok ? 1 : 0) }));
    log(ok);
  };
  const reveal = () => {
    if (status || !cur) return;
    setStatus("revealed");
    setSess((s) => ({ ...s, n: s.n + 1 }));
    log(false);
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Cloze drill</h2>
          <p className="hint">Sentences from your own mastered cards, with the word blanked out. {pool.length} of {bank.words.length} words have a usable sentence. Free: no AI usage.</p>
        </div>
        <span className="muted small">{sess.n ? `This session: ${sess.ok}/${sess.n}` : ""}</span>
      </div>
      <div className="focuses">
        <button className={dia === "all" ? "fchip on" : "fchip"} onClick={() => setDia("all")}>All ({pool.length})</button>
        {dias.map(([d, n]) => <button key={d} className={dia === d ? "fchip on" : "fchip"} onClick={() => setDia(d)}>{d} ({n})</button>)}
      </div>
      {!cur ? <p className="empty">No sentences available for this filter.</p> : (
        <div className="card">
          <div className="cloze ar" lang="ar">
            {cur.b.before && <span>{cur.b.before}{" "}</span>}
            {status ? <b className={status === "right" ? "cl-ok" : "cl-bad"}>{cur.b.shown}</b> : <span className="blank">＿＿＿＿</span>}
            {cur.b.punct}
            {cur.b.after && <span>{" "}{cur.b.after}</span>}
          </div>
          {!status && (showMean ? <p className="hintline"><Lightbulb size={14} /> {cur.w.en}</p>
            : <button className="linkbtn" onClick={() => setShowMean(true)}><Lightbulb size={14} /> Show meaning</button>)}
          <input className="ar cl-input" lang="ar" dir="rtl" value={ans} disabled={!!status} placeholder="اُكْتُبِ الكَلِمَة…"
            onChange={(e) => setAns(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") status ? draw(filtered, cur) : check(); }} />
          {status && (
            <div className="gres">
              <div className="gres-top">
                <b className={status === "right" ? "cl-ok" : "cl-bad"}>{status === "right" ? "Correct." : status === "revealed" ? "Revealed." : "Not quite."}</b>
                <span className="ar" lang="ar">{cur.w.ar}</span><span className="muted">{cur.w.en}</span>
              </div>
              {cur.b.eng && <p className="muted">{cur.b.eng}</p>}
              {formsLine(cur.w) && <p className="ar muted small" lang="ar">{formsLine(cur.w)}</p>}
            </div>
          )}
          <div className="editor-foot">
            <button className="btn ghost" onClick={() => draw(filtered, cur)}>Skip</button>
            <span className="btns">
              {!status && <button className="btn ghost" onClick={reveal}>Show answer</button>}
              {!status && <button className="btn" disabled={!ans.trim()} onClick={check}><Check size={14} /> Check</button>}
              {status && <button className="btn" onClick={() => draw(filtered, cur)}>Next</button>}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function Bank({ bank, setBank, now, upd, life }) {
  const [msg, setMsg] = useState("");
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [q, setQ] = useState("");
  const [dia, setDia] = useState("all");
  const [type, setType] = useState("all");
  const [shown, setShown] = useState(40);
  const has = bank.words.length > 0;

  const ingest = (text) => {
    try {
      const { words, total } = parseMuf(text);
      if (!words.length) throw new Error("empty");
      const prev = new Set(bank.words.map((w) => w.id));
      const nowIds = new Set(words.map((w) => w.id));
      const added = words.filter((w) => !prev.has(w.id)).length;
      const dropped = bank.words.filter((w) => !nowIds.has(w.id)).length;
      setBank((b) => ({ ...b, words, total, importedAt: new Date().toISOString() }));
      setMsg(has ? `Synced: ${words.length} mastered words (${added} new, ${dropped} no longer mastered).` : `Imported ${words.length} mastered words out of ${total} total cards.`);
      setPaste(""); setShowPaste(false);
    } catch (e) { setMsg("That doesn't look like a Mufradaati backup with a mastered box. Nothing was changed."); }
  };
  const onFile = async (f) => {
    if (!f) return;
    try { ingest(await f.text()); } catch (e) { setMsg("Couldn't read that file."); }
  };

  const dias = tally(bank.words, "dia");
  const types = tally(bank.words, "type");
  const maxD = dias[0]?.[1] || 1, maxT = types[0]?.[1] || 1;
  const ql = q.trim().toLowerCase(), qn = nrm(q);
  const list = bank.words.filter((w) => (dia === "all" || w.dia === dia) && (type === "all" || w.type === type)
    && (!ql || w.en.toLowerCase().includes(ql) || (qn && nrm(w.ar).includes(qn))));

  return (
    <>
      <section className="museum-hero">
        <div>
          <h2 className="kufi" lang="ar">بَنْك الكَلِمات</h2>
          <p>Every word you've mastered in Mufradaati, ready to be recycled into exercises. Upload a full Mufradaati backup and only the Mastered box gets kept.</p>
        </div>
        <div className="btns">
          <label className="btn bank-up"><Upload size={14} /> {has ? "Re-sync from backup" : "Upload backup"}
            <input type="file" accept=".json,application/json" hidden onChange={(e) => { onFile(e.target.files[0]); e.target.value = ""; }} />
          </label>
          <button className="btn ghost light" onClick={() => setShowPaste(!showPaste)}>Paste instead</button>
        </div>
      </section>
      {showPaste && (
        <section className="panel">
          <textarea className="exporttext" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste the full Mufradaati backup JSON" />
          <div className="editor-foot"><span /><button className="btn" disabled={!paste.trim()} onClick={() => ingest(paste)}>Import</button></div>
        </section>
      )}
      {msg && <p className="muted">{msg}</p>}
      {!has ? (
        <section className="panel"><p className="empty">The bank is empty. Export a full backup from Mufradaati and upload it here. Re-sync after future study sessions to pull in newly mastered words and drop ones that fell back.</p></section>
      ) : (
        <>
          <div className="stats">
            <Tile v={bank.words.length.toLocaleString()} label="mastered words" />
            <Tile v={bank.total ? Math.round((bank.words.length / bank.total) * 100) + "%" : "–"} label="of all your cards" />
            <Tile v={life.cloze.ok.toLocaleString()} label="cloze answers right" note={life.cloze.n ? `of ${life.cloze.n.toLocaleString()} all time (${Math.round((life.cloze.ok / life.cloze.n) * 100)}%)` : "all time"} />
            <Tile v={bank.importedAt ? shortDate(new Date(bank.importedAt)) : "–"} label="last synced" />
          </div>
          <div className="grid2">
            <section className="panel">
              <h2>By dialect</h2>
              {dias.map(([d, n]) => (
                <div key={d} className="frow"><span>{d}</span><div className="bar"><div style={{ width: `${(n / maxD) * 100}%` }} /></div><span className="muted small">{n}</span></div>
              ))}
            </section>
            <section className="panel">
              <h2>By type</h2>
              {types.map(([t, n]) => (
                <div key={t} className="frow"><span>{t}</span><div className="bar"><div style={{ width: `${(n / maxT) * 100}%` }} /></div><span className="muted small">{n}</span></div>
              ))}
            </section>
          </div>
          <Cloze bank={bank} setBank={setBank} now={now} upd={upd} />
          <section className="panel">
            <h2>Browse</h2>
            <div className="addrow wrap">
              <input value={q} onChange={(e) => { setQ(e.target.value); setShown(40); }} placeholder="Search Arabic (any diacritics) or English" />
              <select value={dia} onChange={(e) => { setDia(e.target.value); setShown(40); }}>
                <option value="all">All dialects</option>{dias.map(([d]) => <option key={d}>{d}</option>)}
              </select>
              <select value={type} onChange={(e) => { setType(e.target.value); setShown(40); }}>
                <option value="all">All types</option>{types.map(([t]) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <p className="hint gap-top">{list.length} word{list.length === 1 ? "" : "s"}</p>
            <div className="blist">
              {list.slice(0, shown).map((w) => (
                <div key={w.id} className="brow">
                  <span className="ar bword" lang="ar">{w.ar}</span>
                  <span className="bmean">{w.en}</span>
                  <span className={"vbadge " + (DIA_CLS[w.dia] || "")}>{w.dia}</span>
                  <span className="muted small">{w.type}</span>
                  {formsLine(w) && <span className="ar bforms" lang="ar">{formsLine(w)}</span>}
                </div>
              ))}
            </div>
            {list.length > shown && <button className="btn ghost gap-top" onClick={() => setShown(shown + 60)}>Show more</button>}
          </section>
        </>
      )}
    </>
  );
}

/* ---------- Museum ---------- */
function Museum({ state, upd, now, onDrill }) {
  const [range, setRange] = useState("30");
  const [open, setOpen] = useState(null);
  const cutoff = range === "all" ? null : addDays(dayStart(now), -30);
  const list = state.mistakes.filter((x) => !cutoff || parseKey(x.date) >= cutoff);
  const groups = CATEGORIES.map(([id]) => ({ id, items: list.filter((x) => x.category === id) })).filter((g) => g.items.length).sort((a, b) => b.items.length - a.items.length);
  const max = groups[0]?.items.length || 1;
  return (
    <>
      <section className="museum-hero">
        <div>
          <h2 className="kufi" lang="ar">مَتْحَف الأَخْطاء</h2>
          <p>Every mistake caught in feedback gets filed here by pattern. One error is a typo. Fourteen is a curriculum.</p>
        </div>
        <div className="seg light">
          <button className={range === "30" ? "on" : ""} onClick={() => setRange("30")}>Last 30 days</button>
          <button className={range === "all" ? "on" : ""} onClick={() => setRange("all")}>All time</button>
        </div>
      </section>
      {groups.length === 0 ? (
        <section className="panel"><p className="empty">The museum is empty. Get feedback in the Journal or the Translation Gym and your mistakes will start getting exhibits.</p></section>
      ) : (
        <section className="panel">
          <p className="hint">{list.length} in view. {getLife(state).mistakes.toLocaleString()} mistakes logged all time.</p>
          <div className="top-offender">
            <span className="muted">Top exhibit</span>
            <b>{catOf(groups[0].id)[1]}</b>
            <span className="ar" lang="ar">{catOf(groups[0].id)[2]}</span>
            <span className="muted">{groups[0].items.length} times</span>
          </div>
          {groups.map((g) => {
            const [id, en, ar] = catOf(g.id);
            const isOpen = open === id;
            return (
              <div key={id} className="exhibit">
                <button className="ex-head" onClick={() => setOpen(isOpen ? null : id)} aria-expanded={isOpen}>
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="ex-name">{en} <span className="ar muted" lang="ar">{ar}</span></span>
                  <span className="ex-bar"><span style={{ width: `${(g.items.length / max) * 100}%` }} /></span>
                  <b>{g.items.length}</b>
                </button>
                {isOpen && (
                  <div className="ex-items">
                    <button className="btn ghost drill" onClick={() => onDrill({ id: "cat-" + id, label: en })}><Dumbbell size={14} /> Drill this in the Gym</button>
                    {g.items.slice().reverse().map((x) => (
                      <div key={x.id} className="corr">
                        <div className="corr-pair ar" lang="ar"><s>{x.wrong}</s><span className="arrow">←</span><b>{x.right}</b></div>
                        <p className="why">{x.why} <span className="muted">· {x.source === "gym" ? "Gym" : "Journal"} · {shortDate(parseKey(x.date))}</span></p>
                        <button className="icon" aria-label="Remove from museum" onClick={() => upd((s) => { s.mistakes = s.mistakes.filter((q) => q.id !== x.id); return s; })}><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}

/* ---------- Backup ---------- */
function Backup({ state, journal, gym, lab, setState, setJournal, setGym, setLab }) {
  const [open, setOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState("");
  const dump = JSON.stringify({ state, journal, gym, lab });
  const restore = () => {
    try {
      const d = JSON.parse(paste);
      if (!d.state || !Array.isArray(d.journal)) throw new Error();
      const st = d.state; if (!st.life) st.life = buildLife(st, d.journal, d.gym, d.lab, null);
      setState(st); setJournal(d.journal); if (d.gym) setGym(d.gym); if (d.lab) setLab(d.lab); setPaste(""); setMsg("Restored.");
    } catch { setMsg("That doesn't look like an Ops Room backup. Paste the full text you copied."); }
  };
  return (
    <footer className="foot">
      <button className="btn ghost" onClick={() => setOpen(!open)}>{open ? "Close backup" : "Backup and restore"}</button>
      {open && (
        <div className="panel backup">
          <p className="hint">Copy this somewhere safe now and then. Paste it back to restore everything.</p>
          <textarea readOnly value={dump} onFocus={(e) => e.target.select()} />
          <button className="btn" onClick={() => { navigator.clipboard?.writeText(dump).then(() => setMsg("Copied."), () => setMsg("Select the text and copy it manually.")); }}>Copy backup</button>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste a backup here to restore" />
          <button className="btn danger" disabled={!paste.trim()} onClick={restore}>Restore from backup</button>
          {msg && <p className="muted">{msg}</p>}
        </div>
      )}
    </footer>
  );
}

/* ---------- App ---------- */
const TABS = [
  ["today", "اليَوْم", "Today"],
  ["path", "المَسار", "Trajectory"],
  ["journal", "اليَوْمِيّات", "Journal"],
  ["gym", "التَّرْجَمَة", "Translation Gym"],
  ["lab", "المُخْتَبَر", "Text Lab"],
  ["bank", "البَنْك", "Word Bank"],
  ["museum", "المَتْحَف", "Museum"],
];
function usePersist(key, value, onFail) {
  useEffect(() => {
    if (value == null) return;
    const t = setTimeout(async () => { try { await window.storage.set(key, JSON.stringify(value), false); } catch (e) { onFail(); } }, 500);
    return () => clearTimeout(t);
  }, [value]);
}

export default function OpsRoom() {
  const [state, setState] = useState(null);
  const [journal, setJournal] = useState(null);
  const [gym, setGym] = useState(null);
  const [lab, setLab] = useState(null);
  const [bank, setBank] = useState(null);
  const [drill, setDrill] = useState(null);
  const [tab, setTab] = useState("today");
  const [saveMsg, setSaveMsg] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  useEffect(() => {
    (async () => {
      let s = null, j = null;
      try { const r = await window.storage.get("opsroom-state", false); if (r && r.value) s = JSON.parse(r.value); } catch (e) {}
      try { const r = await window.storage.get("opsroom-journal", false); if (r && r.value) j = JSON.parse(r.value); } catch (e) {}
      let gy = null, lb = null;
      try { const r = await window.storage.get("opsroom-gym", false); if (r && r.value) gy = JSON.parse(r.value); } catch (e) {}
      try { const r = await window.storage.get("opsroom-lab", false); if (r && r.value) lb = JSON.parse(r.value); } catch (e) {}
      let bk = null;
      try { const r = await window.storage.get("opsroom-bank", false); if (r && r.value) bk = JSON.parse(r.value); } catch (e) {}
      setBank(bk || { words: [], importedAt: null, total: 0, log: [] });
      setGym(gy || { history: [], batch: null });
      setLab(lb || { texts: [], queue: [] });
      if (s && !(s.migrated && s.migrated.vocab)) {
        if (!s.tasks.some((t) => t.id === "vocab")) s.tasks.push({ id: "vocab", name: "Vocabulary", group: "vocab", days: ALL, since: keyOf(new Date()) });
        s.migrated = { ...(s.migrated || {}), vocab: true };
      }
      const st = s || freshState();
      if (!st.life) st.life = buildLife(st, j || [], gy || { history: [] }, lb || { texts: [], queue: [] }, bk);
      setState(st);
      setJournal(j || []);
    })();
  }, []);
  useEffect(() => {
    if (!state) return;
    setSaveMsg("Saving…");
    const t = setTimeout(async () => {
      try { const r = await window.storage.set("opsroom-state", JSON.stringify(state), false); setSaveMsg(r ? "Saved" : "Save failed"); }
      catch (e) { setSaveMsg("Save failed"); }
    }, 400);
    return () => clearTimeout(t);
  }, [state]);
  useEffect(() => {
    if (!journal) return;
    const t = setTimeout(async () => {
      try { await window.storage.set("opsroom-journal", JSON.stringify(journal), false); } catch (e) { setSaveMsg("Journal save failed"); }
    }, 400);
    return () => clearTimeout(t);
  }, [journal]);

  usePersist("opsroom-gym", gym, () => setSaveMsg("Gym save failed"));
  usePersist("opsroom-lab", lab, () => setSaveMsg("Lab save failed"));
  usePersist("opsroom-bank", bank, () => setSaveMsg("Word Bank save failed"));
  const bankSet = useMemo(() => new Set((bank ? bank.words : []).map((w) => nrm(w.ar.split(/[,،]/)[0]))), [bank]);
  const feeds = { journal: journal || [], gym: gym ? gym.history : [], lab: lab ? lab.texts : [], cloze: bank ? bank.log || [] : [] };
  const upd = (fn) => setState((s) => fn(JSON.parse(JSON.stringify(s))));

  return (
    <div className="or">
      <style>{CSS}</style>
      <header className="hdr">
        <svg className="pat" aria-hidden="true">
          <defs>
            <pattern id="zl" width="64" height="64" patternUnits="userSpaceOnUse">
              <g fill="none" stroke="#fff" strokeWidth="1.1">
                <rect x="18" y="18" width="28" height="28" />
                <rect x="18" y="18" width="28" height="28" transform="rotate(45 32 32)" />
                <circle cx="32" cy="32" r="6" />
                <path d="M0 0L12 12M64 0L52 12M0 64L12 52M64 64L52 52" />
              </g>
            </pattern>
            <linearGradient id="fade" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.15" /><stop offset="1" stopColor="#fff" stopOpacity="1" /></linearGradient>
            <mask id="mk"><rect width="100%" height="100%" fill="url(#fade)" /></mask>
          </defs>
          <rect width="100%" height="100%" fill="url(#zl)" mask="url(#mk)" />
        </svg>
        <div className="hdr-in">
          <div className="title">
            <div>
              <h1 className="kufi" lang="ar">غُرْفَة العَمَلِيّات</h1>
              <div className="sub">Arabic operations room</div>
            </div>
            <div className="sub save">{saveMsg}</div>
          </div>
          <nav className="tabs" role="tablist">
            {TABS.map(([id, ar, en]) => (
              <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "tab on" : "tab"} onClick={() => setTab(id)}>
                <span className="ar" lang="ar">{ar}</span><span className="en">{en}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="main">
        {!state || !journal || !gym || !lab || !bank ? <p className="muted">Loading your ops room…</p> : (
          <>
            {tab === "today" && <Today state={state} upd={upd} feeds={feeds} now={now} goTo={setTab} />}
            {tab === "path" && <Trajectory state={state} upd={upd} feeds={feeds} now={now} />}
            {tab === "journal" && <Journal journal={journal} setJournal={setJournal} upd={upd} now={now} bank={bank} life={getLife(state)} />}
            {tab === "gym" && <Gym gym={gym} setGym={setGym} upd={upd} now={now} drill={drill} clearDrill={() => setDrill(null)} bank={bank} life={getLife(state)} />}
            {tab === "lab" && <Lab lab={lab} setLab={setLab} now={now} bankSet={bankSet} upd={upd} life={getLife(state)} />}
            {tab === "bank" && <Bank bank={bank} setBank={setBank} now={now} upd={upd} life={getLife(state)} />}
            {tab === "museum" && <Museum state={state} upd={upd} now={now} onDrill={(f) => { setDrill(f); setTab("gym"); }} />}
            <Backup state={state} journal={journal} gym={gym} lab={lab} setState={setState} setJournal={setJournal} setGym={setGym} setLab={setLab} />
          </>
        )}
      </main>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@500;700&family=Noto+Naskh+Arabic:wght@400;600&family=Outfit:wght@400;500;600;700&display=swap');
.or{--ink:#1B2140;--maj:#3346C4;--majd:#222E8C;--paper:#EFF1F8;--card:#fff;--saf:#E0A129;--mint:#2E8A63;--rose:#C4513B;--line:#DCDFEC;--muted:#6B7093;
  font-family:'Outfit',system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--paper);min-height:100vh;font-size:15px;line-height:1.5}
.or *{box-sizing:border-box}
.ar{font-family:'Noto Naskh Arabic','Geeza Pro','Traditional Arabic',serif;direction:rtl;unicode-bidi:isolate}
.kufi{font-family:'Reem Kufi','Noto Naskh Arabic',serif;font-weight:700}
.muted{color:var(--muted)} .small{font-size:13px}
.or button{font:inherit;cursor:pointer}
.or button:disabled{opacity:.45;cursor:not-allowed}
.or button:focus-visible,.or input:focus-visible,.or textarea:focus-visible,.or select:focus-visible{outline:2px solid var(--saf);outline-offset:2px}
.or input,.or select,.or textarea{font:inherit;color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:8px 10px;background:#fff}

.hdr{background:var(--majd);color:#fff;position:relative;overflow:hidden}
.hdr .pat{position:absolute;inset:0;width:100%;height:100%;opacity:.16}
.hdr-in{position:relative;max-width:1100px;margin:0 auto;padding:26px 20px 0}
.title{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap}
.title h1{font-size:46px;margin:0;line-height:1.15}
.sub{font-size:14px;opacity:.8}
.save{font-size:12px;opacity:.65}
.tabs{display:flex;gap:4px;margin-top:20px;overflow-x:auto}
.tab{background:transparent;border:0;color:#fff;opacity:.72;padding:10px 16px 12px;border-radius:12px 12px 0 0;display:flex;gap:8px;align-items:baseline;white-space:nowrap}
.tab:hover{opacity:1}
.tab.on{background:var(--paper);color:var(--ink);opacity:1}
.tab .ar{font-size:17px}.tab .en{font-size:13px}

.main{max-width:1100px;margin:0 auto;padding:24px 20px 60px;display:flex;flex-direction:column;gap:20px}
.grid2{display:grid;grid-template-columns:1.25fr 1fr;gap:20px;align-items:start}
@media(max-width:820px){.grid2{grid-template-columns:1fr}.title h1{font-size:34px}}
.panel{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px}
.panel h2{font-size:18px;margin:0 0 2px;font-weight:600}
.panel h2.kufi{font-size:24px}
.hint{font-size:13px;color:var(--muted);margin:0 0 14px}
.panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.empty{color:var(--muted);font-size:14px;padding:12px 0}
.err{color:var(--rose)}

.btn{display:inline-flex;align-items:center;gap:6px;background:var(--maj);color:#fff;border:1px solid var(--maj);border-radius:9px;padding:7px 12px;font-size:14px;font-weight:500}
.btn:hover:not(:disabled){background:var(--majd)}
.btn.ghost{background:transparent;color:var(--maj);border-color:var(--line)}
.btn.ghost:hover:not(:disabled){background:#E6E9F7}
.btn.danger{background:transparent;color:var(--rose);border-color:#EBC9C1}
.icon{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:8px;border:1px solid var(--line);background:#fff;color:var(--muted)}
.icon:hover{color:var(--ink)}
.icon.inc{background:var(--maj);border-color:var(--maj);color:#fff}

.hero{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;padding:4px 4px 0}
.hero-day{font-size:56px;line-height:1.1;color:var(--majd)}
.hero-date{color:var(--muted);font-size:15px}
.hero-status{margin-top:6px;font-weight:500}
.hero-status.win{color:var(--mint);font-size:18px}
.hero-status.win .ar{font-size:22px;margin-right:6px}
.hero-right{display:flex;align-items:center;gap:22px}
.ringbox{position:relative;display:grid;place-items:center}
.ringbox span{position:absolute;font-weight:600;font-size:18px}
.ringbox.small span{font-size:13px}
.streak{display:flex;flex-direction:column;align-items:center;color:var(--saf)}
.streak b{font-size:28px;line-height:1;color:var(--ink)}
.streak span{font-size:12px;color:var(--muted)}

.group{margin-bottom:14px}
.group-head{display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:var(--muted);margin-bottom:4px;padding:0 2px}
.task{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:transparent;border:0;border-radius:9px;padding:8px 6px;color:var(--ink)}
.task:hover{background:#F3F4FA}
.tick{flex:none;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;border:2px solid #C3C8DE;background:#fff;color:#fff;padding:0;transition:background .15s,border-color .15s}
.task.done .tick,.mile.done .tick{background:var(--mint);border-color:var(--mint)}
.task.done>span:last-child{color:var(--muted);text-decoration:line-through;text-decoration-color:#B8BCD2}

.sched-row{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #EEF0F6;flex-wrap:wrap}
.sched-name{flex:1;min-width:140px}
.daychips{display:flex;gap:3px}
.dchip{width:30px;height:26px;border-radius:6px;border:1px solid var(--line);background:#fff;font-size:12px;color:var(--muted)}
.dchip.on{background:var(--maj);border-color:var(--maj);color:#fff}
.addrow{display:flex;gap:8px;margin-top:12px}
.addrow input{flex:1;min-width:0}
.addrow.wrap{flex-wrap:wrap}
.addrow .inl{display:flex;align-items:center;gap:6px;font-size:14px;color:var(--muted)}
.addrow .inl input{width:64px;flex:none}

.trow{padding:12px 0;border-bottom:1px solid #EEF0F6}
.trow:last-child{border-bottom:0}
.trow-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.trow-name{font-weight:500}
.trow-mid{display:flex;align-items:center;gap:12px;margin-top:8px}
.trow-num{font-weight:600;font-size:17px;min-width:44px}
.steppers{display:flex;gap:4px;margin-left:auto}
.auto{margin-left:auto;font-size:12px;color:var(--muted);border:1px dashed var(--line);padding:2px 8px;border-radius:20px}
.pill{font-size:12px;padding:2px 9px;border-radius:20px;font-weight:500}
.pill.done{background:#DDF1E7;color:var(--mint)}
.pill.on{background:#E3E7FA;color:var(--maj)}
.pill.behind{background:#FBEFD6;color:#9A6A0C}
.pips{display:flex;gap:5px;flex-wrap:wrap;align-items:center;flex:1}
.pip{width:14px;height:14px;border-radius:50%;border:2px solid #C3C8DE}
.pip.on{background:var(--maj);border-color:var(--maj)}
.extra{font-size:12px;font-weight:600;color:var(--mint)}
.bar{flex:1;height:10px;background:#E6E8F1;border-radius:6px;overflow:hidden}
.bar div{height:100%;background:var(--maj)}
.trow-foot{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-top:10px;flex-wrap:wrap}
.trow-edit{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted)}
.trow-edit input{width:64px;margin-left:6px}
.hist{display:flex;gap:6px;align-items:flex-end}
.hist-col{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;color:var(--muted)}
.hist-bar{width:18px;height:34px;background:#EEF0F6;border-radius:4px;display:flex;align-items:flex-end;overflow:hidden}
.hist-bar div{width:100%;background:#8F9AE0;border-radius:4px}
.hist-bar div.full{background:var(--mint)}

.hm-wrap{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start}
.hm-days{display:flex;flex-direction:column;gap:3px;font-size:10px;color:var(--muted)}
.hm-days span{height:15px;line-height:15px}
.hm{display:flex;gap:3px;overflow-x:auto;max-width:100%}
.hm-col{display:flex;flex-direction:column;gap:3px}
.hm-cell{display:block;width:15px;height:15px;border-radius:4px;background:#F4F5FA}
.hm-cell.l0{background:#E3E5EF}
.hm-cell.l1{background:#C7CDF0}.hm-cell.l2{background:#8F9AE0}.hm-cell.l3{background:#5566CF}.hm-cell.l4{background:var(--majd)}
.hm-cell.off{background:transparent;border:1px dashed var(--line)}
.hm-cell.now{box-shadow:0 0 0 2px var(--saf)}
.hm-legend{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--muted);width:100%;margin-top:6px}
.hm-legend span{margin:0 4px}

.objs{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
.obj{border:1px solid var(--line);border-radius:12px;padding:14px;background:#FBFBFE}
.obj-head{display:flex;gap:12px;align-items:center}
.obj-title{flex:1;min-width:0}
.obj-title h3{margin:0;font-size:16px;font-weight:600}
.obj-title input.big{width:100%;font-weight:600}
.obj-meta{margin-top:4px;font-size:13px;color:var(--muted)}
.obj-meta input{margin-left:6px;padding:4px 6px}
.count{font-weight:500;color:var(--maj)}
.count.late{color:var(--rose)}
.miles{margin-top:10px;display:flex;flex-direction:column;gap:2px}
.mile{display:flex;align-items:center;gap:10px;padding:5px 0}
.mile-text{flex:1;font-size:14px}
.mile.done .mile-text{color:var(--muted);text-decoration:line-through}
.miles .btn.danger{margin-top:8px;align-self:flex-start}

.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.stats div{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 16px;display:flex;flex-direction:column}
.stats b{font-size:24px;line-height:1.2}
.stats span{font-size:12px;color:var(--muted)}
@media(max-width:620px){.stats{grid-template-columns:repeat(2,1fr)}}
.seg{display:flex;background:#EEF0F6;border-radius:10px;padding:3px;gap:2px}
.seg button{border:0;background:transparent;border-radius:8px;padding:5px 12px;color:var(--muted);font-size:14px}
.seg button.on{background:#fff;color:var(--ink);box-shadow:0 1px 2px rgba(27,33,64,.12)}
.seg .ar{font-size:16px}
.promptbar{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}
.promptbar p{margin:0;font-size:14px}
.chip{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;background:#E3E7FA;color:var(--maj);font-family:'Outfit',sans-serif;direction:ltr}
.editor{width:100%;min-height:240px;font-size:20px;line-height:1.9;resize:vertical}
.editor-foot{display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:10px;flex-wrap:wrap}
.btns{display:flex;gap:8px;flex-wrap:wrap}
.entries{display:flex;flex-direction:column;gap:6px;max-height:520px;overflow:auto}
.entry{text-align:left;border:1px solid var(--line);background:#fff;border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:4px}
.entry:hover{border-color:#B9C0E6}
.entry-meta{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px}
.entry-snip{font-size:16px;text-align:right}
.dot{width:7px;height:7px;border-radius:50%;background:var(--mint);display:inline-block}
.entry-text{font-size:19px;line-height:1.9;white-space:pre-wrap;background:#FAFAFD;border-radius:10px;padding:12px 14px;margin:6px 0 14px}
.entry-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}

.fb{display:flex;flex-direction:column;gap:12px}
.fb-overall{margin:0;font-weight:500;border-left:3px solid var(--saf);padding-left:10px}
.fb-up{background:#F5F7FF;border-radius:10px;padding:10px 12px}
.fb-label{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--maj)}
.fb-up p{margin:6px 0}
.strike-soft{color:var(--muted);font-size:17px}
.better{font-size:19px;color:var(--ink)}
.why{font-size:13px;color:var(--muted);margin:2px 0 0}
.corrs{display:flex;flex-direction:column;gap:10px}
.corr{border-bottom:1px solid #EEF0F6;padding-bottom:10px;position:relative}
.corr .icon{position:absolute;top:0;right:0;width:24px;height:24px}
.corr-pair{font-size:18px;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin:4px 0}
.corr-pair s{color:var(--rose);text-decoration-thickness:1px}
.corr-pair b{color:var(--mint);font-weight:600}
.arrow{color:var(--muted);font-size:14px}

.museum-hero{background:var(--ink);color:#fff;border-radius:14px;padding:22px 24px;display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
.museum-hero h2{margin:0;font-size:34px;color:#fff}
.museum-hero p{margin:6px 0 0;opacity:.8;max-width:56ch}
.seg.light{background:rgba(255,255,255,.12)}
.seg.light button{color:#fff;opacity:.75}
.seg.light button.on{background:#fff;color:var(--ink);opacity:1}
.top-offender{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;padding-bottom:14px;margin-bottom:6px;border-bottom:1px solid var(--line)}
.top-offender b{font-size:20px}
.top-offender .ar{font-size:18px;color:var(--rose)}
.exhibit{border-bottom:1px solid #EEF0F6}
.ex-head{display:flex;align-items:center;gap:10px;width:100%;background:transparent;border:0;padding:10px 2px;text-align:left;color:var(--ink)}
.ex-name{flex:0 0 260px;display:flex;gap:8px;align-items:baseline}
.ex-name .ar{font-size:15px}
.ex-bar{flex:1;height:10px;background:#EEF0F6;border-radius:6px;overflow:hidden}
.ex-bar span{display:block;height:100%;background:var(--rose);border-radius:6px}
@media(max-width:620px){.ex-name{flex:1 1 100%}.ex-head{flex-wrap:wrap}}
.ex-items{padding:4px 0 12px 26px;display:flex;flex-direction:column;gap:10px}

.foot{display:flex;flex-direction:column;align-items:flex-start;gap:10px}
.backup{display:flex;flex-direction:column;gap:10px;width:100%}
.backup textarea{min-height:80px;font-size:12px;font-family:ui-monospace,monospace}
.focuses{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.fchip{border:1px solid var(--line);background:#fff;border-radius:20px;padding:4px 11px;font-size:13px;color:var(--ink)}
.fchip.on{background:var(--ink);border-color:var(--ink);color:#fff}
.gym-controls{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:14px}
.card{border:1px solid var(--line);border-radius:12px;padding:16px;background:#FBFBFE}
.en-sent{font-size:21px;line-height:1.4;margin:6px 0 10px;font-weight:500}
.linkbtn{background:none;border:0;color:var(--maj);display:inline-flex;gap:6px;align-items:center;padding:0;font-size:14px;margin-bottom:10px}
.hintline{display:flex;gap:6px;align-items:flex-start;font-size:14px;color:#8A5E08;background:#FBF3E0;border-radius:8px;padding:6px 10px;margin:0 0 10px}
.editor.short{min-height:110px}
.gres{margin-top:12px;display:flex;flex-direction:column;gap:10px}
.gres-top{display:flex;align-items:center;gap:10px;font-weight:500}
.score{display:inline-flex;gap:3px;vertical-align:middle}
.score i{width:10px;height:10px;border-radius:3px;background:#E3E5EF;display:block}
.score i.on.s5,.score i.on.s4{background:var(--mint)}
.score i.on.s3{background:var(--saf)}
.score i.on.s2,.score i.on.s1{background:var(--rose)}
.model{font-size:21px;line-height:1.8;margin:0;color:var(--ink)}
.alt{font-size:17px;color:var(--muted);margin:0}
.done-card{text-align:center}
.big-ar{font-size:40px;margin:0;color:var(--mint)}
.frow{display:grid;grid-template-columns:minmax(0,1fr) 90px 64px;gap:10px;align-items:center;font-size:14px;padding:5px 0}
.frow .bar{height:8px}
.gap-top{margin-top:20px!important}
.reader{font-size:20px;line-height:2.1;white-space:pre-wrap;max-height:680px;overflow:auto}
.reader mark{background:#FBEBC4;color:inherit;border-radius:4px;padding:0 2px}
.lab-grid{grid-template-columns:1fr 1fr}
@media(max-width:820px){.lab-grid{grid-template-columns:1fr}}
.subtabs{margin-bottom:14px;display:inline-flex}
.vhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.vlist{display:flex;flex-direction:column;gap:8px;margin-bottom:12px;max-height:560px;overflow:auto}
.vcard{border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.vtop{display:flex;align-items:center;gap:8px}
.vword{font-size:23px;flex:1;text-align:right}
.vbadge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;background:#E3E7FA;color:var(--maj)}
.vbadge.shaami{background:#DDF1E7;color:var(--mint)}
.vbadge.darija{background:#F7E1DA;color:var(--rose)}
.vbadge.both{background:#FBEFD6;color:#8A5E08}
.icon.qd{background:#DDF1E7;border-color:#BFE3D0;color:var(--mint)}
.vmean{margin-top:4px;font-weight:500}
.vgram{display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:var(--muted);margin-top:4px}
.vgram .ar{font-size:16px;color:var(--ink)}
.vex{font-size:16px;margin:6px 0 0;background:#FAFAFD;border-radius:6px;padding:4px 8px}
.qa{margin-bottom:14px}
.q{margin:0 0 6px;font-weight:500}
.ar.q{font-size:18px}
.ans{width:100%;min-height:60px}
.ar.ans{font-size:18px}
.grade{margin-top:6px;font-size:14px;border-radius:8px;padding:6px 10px}
.grade.yes{background:#DDF1E7}.grade.partly{background:#FBF3E0}.grade.no{background:#F7E1DA}
.key{margin:4px 0 0;color:var(--muted)}
.bd{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}
.bd-tr{font-weight:500;margin:4px 0}
.bd-rows{display:flex;flex-direction:column;gap:4px;margin:8px 0}
.bd-row{display:grid;grid-template-columns:minmax(90px,40%) 1fr;gap:12px;font-size:14px;align-items:baseline;border-bottom:1px dashed #EEF0F6;padding:3px 0}
.bd-row .ar{font-size:17px}
.entry-title{font-weight:500}
.full{width:100%;margin-bottom:10px}
.labopts{display:flex;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap}
.qchips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.qchip{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--line);border-radius:20px;padding:2px 4px 2px 10px}
.qchip .ar{font-size:16px}
.qchip button{border:0;background:transparent;color:var(--muted);display:grid;place-items:center;padding:2px}
.exporttext{width:100%;min-height:140px;font-size:12px;font-family:ui-monospace,monospace;margin-top:8px}
.tedit{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}
.tedit>input{flex:1;min-width:160px}
.tedit .inl{display:flex;align-items:center;gap:6px;font-size:14px;color:var(--muted)}
.tedit .inl input{width:64px}
.tedit-btns{display:flex;gap:6px;align-items:center}
.drill{align-self:flex-start}
.shotbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.shotbar label.btn{cursor:pointer}
.shotbar label.disabled{opacity:.45;cursor:not-allowed}
.usewords{display:flex;align-items:center;gap:8px;font-size:14px;margin-bottom:12px}
.usewords.off{opacity:.55}
.wip{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.wchip{display:inline-flex;gap:6px;align-items:baseline;border:1px solid var(--line);border-radius:20px;padding:2px 10px;font-size:13px;background:#fff}
.wchip .ar{font-size:16px}
.challenge{margin-bottom:10px}
.ch-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:8px}
.ch-chips{display:flex;flex-wrap:wrap;gap:6px}
.chw{display:inline-flex;flex-direction:column;align-items:center;border:1px solid var(--line);background:#fff;border-radius:10px;padding:4px 12px;color:var(--ink)}
.chw .ar{font-size:18px}
.chw .small{color:var(--muted);font-size:12px}
.chw.used{background:#DDF1E7;border-color:#BFE3D0}
.chw.used .ar{text-decoration:line-through;text-decoration-color:var(--mint)}
.vbadge.known{background:#DDF1E7;color:var(--mint)}
.cloze{font-size:26px;line-height:2;margin:10px 0}
.blank{display:inline-block;min-width:72px;border-bottom:3px solid var(--maj);text-align:center;color:var(--maj)}
.cl-ok{color:var(--mint)}.cl-bad{color:var(--rose)}
.cl-input{width:100%;font-size:22px;margin:6px 0}
.brow{display:grid;grid-template-columns:minmax(120px,1.1fr) 1.4fr auto auto;gap:12px;align-items:baseline;padding:8px 2px;border-bottom:1px solid #EEF0F6}
.bword{font-size:22px;text-align:right}
.bmean{font-size:14px}
.bforms{grid-column:1/-1;font-size:15px;color:var(--muted)}
.blist{max-height:640px;overflow:auto}
.bank-up{cursor:pointer;background:#fff;color:var(--ink);border-color:#fff}
.btn.ghost.light{color:#fff;border-color:rgba(255,255,255,.4)}
.btn.ghost.light:hover:not(:disabled){background:rgba(255,255,255,.12)}
@media(max-width:620px){.brow{grid-template-columns:1fr auto}.bmean{grid-column:1/-1}}
.stats em.life{font-size:11px;color:var(--maj);font-style:normal;margin-top:2px}
.streak span+span{font-size:11px}
@media (prefers-reduced-motion: reduce){.or *{transition:none!important}}
`;
