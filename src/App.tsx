import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AgentPlan, ChatMessage, PerformanceMetrics, ProviderConfig, RiderInput, Recommendation, RIDING_STYLES,
  chat, generatePlan, generatePlanFromChat, planFromAssistantReply,
  getChatConfig, setChatConfig, getAgentConfig, setAgentConfig,
  marketplaceLinks,
} from './lib/agent';

type CartItem = {
  id: string;
  name: string;
  brand: string;
  tierLabel: string;
  reason: string;
  estCostPHP: number;
  priceMin: number;
  priceMax: number;
  searchQuery: string;
};

const LS = {
  cart: 'revmind_cart',
  chat: 'revmind_chat',
  plan: 'revmind_plan',
  input: 'revmind_input',
  theme: 'revmind_theme',
};

const DEFAULT_INPUT: RiderInput = {
  model: 'Yamaha Aerox 155',
  year: '2023',
  mileage: '8000',
  budgetPHP: 15000,
  goal: 'Better acceleration',
  ridingStyle: 'Daily Commuting',
  existingMods: '',
};

const MODELS = [
  'Yamaha Aerox 155', 'Yamaha NMAX 155', 'Yamaha Mio Sporty', 'Yamaha Sniper 155',
  'Honda Click 125', 'Honda Click 160', 'Honda ADV 160', 'Honda PCX 160',
  'Honda Beat', 'Honda RS125', 'Honda XRM 125', 'Honda Wave 110',
  'Suzuki Raider R150', 'Suzuki Burgman Street 125', 'Kawasaki Rouser NS160',
];

const GOALS = [
  'Better acceleration', 'Higher top speed', 'Better fuel efficiency',
  'Comfort', 'Daily commuting', 'Long rides', 'Aesthetics',
];

/* -------- Strip markdown from AI responses -------- */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')    // remove code fences
    .replace(/`([^`]+)`/g, '$1')       // inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1')     // italic
    .replace(/__([^_]+)__/g, '$1')     // bold underscores
    .replace(/_([^_]+)_/g, '$1')       // italic underscores
    .replace(/^#{1,6}\s+/gm, '')       // headings
    .replace(/^[\-\*]\s/gm, '- ')      // normalize list bullets
    .replace(/\n{3,}/g, '\n\n')        // collapse multiple newlines
    .trim();
}

/* -------- Perf metric bar -------- */
function ScoreBar({ value, max = 100, color = '#ff2d2d' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="score-bar-track">
      <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* -------- Performance comparison table -------- */
function PerfComparison({
  stock, current, predicted,
}: {
  stock: PerformanceMetrics;
  current: PerformanceMetrics;
  predicted: PerformanceMetrics;
}) {
  const rows: Array<{
    label: string;
    unit: string;
    stock: number;
    current: number;
    predicted: number;
    isBar?: boolean;
    lowerBetter?: boolean;
    max?: number;
  }> = [
    { label: 'Top Speed',         unit: 'km/h', stock: stock.topSpeedKmh,         current: current.topSpeedKmh,         predicted: predicted.topSpeedKmh,         max: 180 },
    { label: '0–60 Acceleration', unit: 'sec',  stock: stock.accel0to60,           current: current.accel0to60,           predicted: predicted.accel0to60,           lowerBetter: true, max: 15 },
    { label: '0–100 Acceleration',unit: 'sec',  stock: stock.accel0to100,          current: current.accel0to100,          predicted: predicted.accel0to100,          lowerBetter: true, max: 25 },
    { label: 'Throttle Response', unit: '/100', stock: stock.throttleResponse,      current: current.throttleResponse,     predicted: predicted.throttleResponse,     isBar: true, max: 100 },
    { label: 'Midrange Pull',     unit: '/100', stock: stock.midrangePull,          current: current.midrangePull,         predicted: predicted.midrangePull,         isBar: true, max: 100 },
    { label: 'High-Speed Stability', unit: '/100', stock: stock.highSpeedStability, current: current.highSpeedStability,   predicted: predicted.highSpeedStability,   isBar: true, max: 100 },
    { label: 'Fuel Efficiency',   unit: 'km/L', stock: stock.fuelEfficiency,        current: current.fuelEfficiency,       predicted: predicted.fuelEfficiency,       max: 80 },
  ];

  function delta(a: number, b: number, lowerBetter = false) {
    if (a === 0 || b === 0) return null;
    const d = b - a;
    if (d === 0) return null;
    const pos = lowerBetter ? d < 0 : d > 0;
    return { val: d, pos };
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-chrome/60 uppercase tracking-wider">
            <th className="text-left pb-2 pr-2">Metric</th>
            <th className="text-center pb-2 px-2">Stock</th>
            <th className="text-center pb-2 px-2">Current</th>
            <th className="text-center pb-2 pl-2 text-accent">Predicted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const skipRow = row.lowerBetter && row.stock === 0;
            if (skipRow) return null;
            const d1 = delta(row.stock, row.current, row.lowerBetter);
            const d2 = delta(row.current > 0 ? row.current : row.stock, row.predicted, row.lowerBetter);
            return (
              <tr key={row.label} className="border-t border-white/5">
                <td className="py-2 pr-2 text-chrome/80 whitespace-nowrap">{row.label}</td>
                <td className="py-2 px-2 text-center">
                  {row.isBar
                    ? <><ScoreBar value={row.stock} max={row.max} color="#555" /><span className="text-chrome/50">{row.stock}</span></>
                    : <span className="text-chrome/50">{row.stock === 0 ? '—' : `${row.stock} ${row.unit}`}</span>
                  }
                </td>
                <td className="py-2 px-2 text-center">
                  {row.isBar
                    ? <><ScoreBar value={row.current} max={row.max} color="#4a9eff" /><span className="text-sky-400">{row.current}</span></>
                    : <span className="text-sky-400">
                        {row.current === 0 ? '—' : `${row.current} ${row.unit}`}
                        {d1 && <span className={`ml-1 ${d1.pos ? 'text-emerald-400' : 'text-red-400'}`}>({d1.pos ? '+' : ''}{row.lowerBetter ? (d1.val).toFixed(2) : d1.val})</span>}
                      </span>
                  }
                </td>
                <td className="py-2 pl-2 text-center font-bold">
                  {row.isBar
                    ? <><ScoreBar value={row.predicted} max={row.max} color="#ff2d2d" /><span className="text-accent">{row.predicted}</span></>
                    : <span className="text-accent">
                        {row.predicted === 0 ? '—' : `${row.predicted} ${row.unit}`}
                        {d2 && <span className={`ml-1 font-normal ${d2.pos ? 'text-emerald-400' : 'text-red-400'}`}>({d2.pos ? '+' : ''}{row.lowerBetter ? (d2.val).toFixed(2) : d2.val})</span>}
                      </span>
                  }
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [input, setInput] = useState<RiderInput>(() => loadLS(LS.input, DEFAULT_INPUT));
  const [plan, setPlan] = useState<AgentPlan | null>(() => loadLS(LS.plan, null));
  const [cart, setCart] = useState<CartItem[]>(() => loadLS(LS.cart, []));
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadLS(LS.chat, []));
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Recommendation | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (loadLS(LS.theme, 'dark') as 'dark' | 'light'));
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Apply theme to html element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveLS(LS.theme, theme);
  }, [theme]);

  useEffect(() => saveLS(LS.input, input), [input]);
  useEffect(() => saveLS(LS.plan, plan), [plan]);
  useEffect(() => saveLS(LS.cart, cart), [cart]);
  useEffect(() => saveLS(LS.chat, messages), [messages]);
  useEffect(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, chatLoading]);

  const cartTotal    = useMemo(() => cart.reduce((s, c) => s + c.estCostPHP, 0), [cart]);
  const cartRangeMin = useMemo(() => cart.reduce((s, c) => s + (c.priceMin || c.estCostPHP), 0), [cart]);
  const cartRangeMax = useMemo(() => cart.reduce((s, c) => s + (c.priceMax || c.estCostPHP), 0), [cart]);

  async function runAgent() {
    setLoading(true);
    try {
      const p = await generatePlan(input, messages);
      setPlan(p);
      setMessages(m => [
        ...m,
        { role: 'user', content: `Build a plan for my ${input.model} (${input.year}) — goal: ${input.goal}, budget PHP ${input.budgetPHP}.` },
        { role: 'assistant', content: `Plan ready: ${p.recommendations.length} parts, total PHP ${p.totalPHP.toLocaleString()} (range ₱${p.totalRange?.min?.toLocaleString()}–₱${p.totalRange?.max?.toLocaleString()}). ${p.analysis}` },
      ]);
    } catch (e: any) {
      alert(e.message);
    } finally { setLoading(false); }
  }

  async function sendChat() {
    if (!chatInput.trim()) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: chatInput.trim() }];
    setMessages(next); setChatInput(''); setChatLoading(true);
    try {
      const reply = await chat(next);
      const updated = [...next, { role: 'assistant', content: reply }] as ChatMessage[];
      setMessages(updated);

      // Keep Agent Plan/performance panels in sync with listed mechanic chat items.
      // 1) Fast local parser from assistant bullet/numbered lists.
      // 2) Fallback to model-assisted extractor if local parse finds nothing.
      const directPlan = planFromAssistantReply(input, reply);
      if (directPlan) {
        setPlan(directPlan);
      } else {
        const chatSyncedPlan = await generatePlanFromChat(input, updated);
        if (chatSyncedPlan) setPlan(chatSyncedPlan);
      }
    } finally { setChatLoading(false); }
  }

  function addToCart(r: { name: string; brand: string; tierLabel: string; reason: string; estCostPHP: number; priceRange?: { min: number; max: number }; searchQuery: string }) {
    setCart(c => [...c, {
      ...r,
      id: crypto.randomUUID(),
      priceMin: r.priceRange?.min ?? r.estCostPHP,
      priceMax: r.priceRange?.max ?? r.estCostPHP,
    }]);
  }
  function removeFromCart(id: string) { setCart(c => c.filter(x => x.id !== id)); }
  function clearAll() {
    if (!confirm('Clear cart, plan, and chat memory?')) return;
    setCart([]); setPlan(null); setMessages([]);
  }

  return (
    <div className="min-h-screen text-ink">
      {/* HEADER */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg carbon flex items-center justify-center shadow-glow">
              <span className="text-2xl">🏍️</span>
            </div>
            <div>
              <div className="font-display text-xl font-black tracking-widest">
                REV<span className="text-accent">MIND</span>
              </div>
              <div className="text-xs text-chrome/70 -mt-1">AI Moto Modification Agent</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-lg bg-panel border border-white/5 text-sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle dark/light mode">
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button className="px-3 py-2 rounded-lg bg-panel border border-white/5 text-sm relative" onClick={() => setShowCart(true)}>
              🧰 Cart
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{cart.length}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT: Input form */}
        <section className="lg:col-span-4 panel p-5 h-fit">
          <div className="rev-line mb-3" />
          <h2 className="font-display text-lg font-bold mb-4">RIDER PROFILE</h2>
          <div className="grid grid-cols-1 gap-3">
            <Field label="Motorcycle">
              <select className="field" value={input.model} onChange={e => setInput({ ...input, model: e.target.value })}>
                {MODELS.map(m => <option key={m}>{m}</option>)}
                <option value="">Other (type below)</option>
              </select>
              {!MODELS.includes(input.model) && (
                <input className="field mt-2" placeholder="Type model" value={input.model} onChange={e => setInput({ ...input, model: e.target.value })} />
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Year"><input className="field" value={input.year} onChange={e => setInput({ ...input, year: e.target.value })} /></Field>
              <Field label="Mileage (km)"><input className="field" value={input.mileage} onChange={e => setInput({ ...input, mileage: e.target.value })} /></Field>
            </div>
            <Field label="Budget (PHP)">
              <input type="number" className="field" value={input.budgetPHP} onChange={e => setInput({ ...input, budgetPHP: Number(e.target.value) })} />
            </Field>
            <Field label="Goal">
              <select className="field" value={input.goal} onChange={e => setInput({ ...input, goal: e.target.value })}>
                {GOALS.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Riding Style">
              <select className="field" value={input.ridingStyle} onChange={e => setInput({ ...input, ridingStyle: e.target.value })}>
                {RIDING_STYLES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Existing Modifications">
              <textarea className="field" rows={2} value={input.existingMods} onChange={e => setInput({ ...input, existingMods: e.target.value })} placeholder="e.g. open pod filter, racing CDI, pipe" />
            </Field>
            <button className="btn-rev mt-2" onClick={runAgent} disabled={loading}>
              {loading ? '🔍 Finding parts…' : '🚀 Run Agent'}
            </button>
            <button className="text-xs text-chrome/60 hover:text-accent mt-1" onClick={clearAll}>Clear all memory</button>
          </div>
        </section>

        {/* MIDDLE: Plan + recommendations + performance sections */}
        <section className="lg:col-span-5 space-y-5">

          {/* Current Setup Analysis */}
          {plan && plan.setupAnalysis && plan.setupAnalysis.detectedMods.length > 0 && (
            <div className="panel p-5">
              <div className="rev-line mb-3" />
              <h2 className="font-display text-lg font-bold mb-3">CURRENT SETUP ANALYSIS</h2>
              <div className="space-y-3">
                {/* Detected mods list */}
                <div>
                  <p className="text-xs uppercase tracking-wider text-chrome/60 mb-2">Detected Modifications</p>
                  <div className="flex flex-wrap gap-2">
                    {plan.setupAnalysis.detectedMods.map((m, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/25 font-medium">
                        ⚡ {m.modName}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Performance effects summary */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(() => {
                    const totalTopSpeed = plan.setupAnalysis.detectedMods.reduce((s, m) => s + m.topSpeedDelta, 0);
                    const totalAccel    = plan.setupAnalysis.detectedMods.reduce((s, m) => s + m.accelPct, 0);
                    const totalThrottle = plan.setupAnalysis.detectedMods.reduce((s, m) => s + m.throttlePct, 0);
                    return (
                      <>
                        <div className="rounded-lg bg-panel2 border border-white/5 p-2.5 text-center">
                          <div className="text-accent font-display font-bold text-sm">+{totalTopSpeed} km/h</div>
                          <div className="text-[10px] text-chrome/60 mt-0.5">Top Speed</div>
                        </div>
                        <div className="rounded-lg bg-panel2 border border-white/5 p-2.5 text-center">
                          <div className="text-accent font-display font-bold text-sm">+{totalAccel}%</div>
                          <div className="text-[10px] text-chrome/60 mt-0.5">Acceleration</div>
                        </div>
                        <div className="rounded-lg bg-panel2 border border-white/5 p-2.5 text-center">
                          <div className="text-accent font-display font-bold text-sm">+{totalThrottle}%</div>
                          <div className="text-[10px] text-chrome/60 mt-0.5">Throttle Resp.</div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Synergies */}
                {plan.setupAnalysis.synergies.length > 0 && (
                  <div className="space-y-1">
                    {plan.setupAnalysis.synergies.map((s, i) => (
                      <div key={i} className="synergy-pill">{s}</div>
                    ))}
                  </div>
                )}

                {/* Conflicts */}
                {plan.setupAnalysis.conflicts.length > 0 && (
                  <div className="space-y-1">
                    {plan.setupAnalysis.conflicts.map((c, i) => (
                      <div key={i} className="conflict-pill">{c}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Agent Plan */}
          <div className="panel p-5">
            <div className="rev-line mb-3" />
            <h2 className="font-display text-lg font-bold mb-2">AGENT PLAN</h2>
            {!plan && <p className="text-chrome/70 text-sm">Fill the form and press <b>Run Agent</b>. The agent will analyze your bike, reason about goals, prioritize mods, and stay within budget.</p>}
            {plan && (
              <>
                {plan.analysis?.trim() && (
                  <p className="text-sm text-ink/90 mb-4 leading-relaxed">{plan.analysis}</p>
                )}
                {/* Scrollable recommendation list */}
                <div className="plan-scroll space-y-3 pr-1">
                  {plan.recommendations.map((r, i) => {
                    const compatColor = r.compatibilityScore === 'High' ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                      : r.compatibilityScore === 'Medium' ? 'text-amber-400 bg-amber-500/15 border-amber-500/30'
                      : 'text-red-400 bg-red-500/15 border-red-500/30';
                    return (
                      <div key={i} className="rounded-xl border border-white/5 bg-panel2/60 p-3 cursor-pointer hover:border-accent/30 transition-colors" onClick={() => setSelectedItem(r)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-display text-sm font-bold flex items-center gap-2 flex-wrap">
                              <span className="text-accent">#{r.priority}</span> {r.name}
                              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-chrome">{r.category}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {r.brand && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
                                  {r.brand}
                                </span>
                              )}
                              {r.tierLabel && (
                                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${r.tierLabel === 'Premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : r.tierLabel === 'Mid-Range' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  }`}>
                                  {r.tierLabel}
                                </span>
                              )}
                              {r.compatibilityScore && (
                                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold border ${compatColor}`}>
                                  {r.compatibilityScore} Compat
                                </span>
                              )}
                            </div>
                            {r.reason?.trim() && (
                              <p className="text-sm text-chrome/90 mt-1.5 line-clamp-2">{r.reason}</p>
                            )}

                            {!plan.hidePricing && (
                              <div className="text-sm mt-2 flex items-center gap-2">
                                <b>₱{r.priceRange ? `${r.priceRange.min.toLocaleString()} – ₱${r.priceRange.max.toLocaleString()}` : r.estCostPHP.toLocaleString()}</b>
                              </div>
                            )}

                            <div className="text-[10px] text-sky-300/60 mt-1.5">Tap for details →</div>
                          </div>
                          <button title="Add to cart"
                            onClick={(e) => { e.stopPropagation(); addToCart(r); }}
                            className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent2 text-white text-xl font-bold shadow-glow hover:scale-105 transition">
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!plan.hidePricing && (
                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <div className="text-sm text-chrome">Plan Total</div>
                    <div>
                      <div className="font-display font-bold text-xl">₱{plan.totalPHP.toLocaleString()}</div>
                      {plan.totalRange && (
                        <div className="text-xs text-chrome/60 text-right">Range: ₱{plan.totalRange.min.toLocaleString()} – ₱{plan.totalRange.max.toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                )}
                {plan.notes && <p className="text-xs text-chrome/60 mt-2 italic">{plan.notes}</p>}
              </>
            )}
          </div>

          {/* Performance Comparison */}
          {plan && plan.stockPerformance && (
            <div className="panel p-5">
              <div className="rev-line mb-3" />
              <h2 className="font-display text-lg font-bold mb-1">PERFORMANCE COMPARISON</h2>
              <p className="text-xs text-chrome/60 mb-4">Stock vs Current Setup vs Predicted Build</p>

              {/* Legend */}
              <div className="flex gap-4 mb-4 text-xs">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-chrome/40 inline-block" /> Stock</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-sky-400 inline-block" /> Current</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-accent inline-block" /> Predicted</div>
              </div>

              <PerfComparison
                stock={plan.stockPerformance}
                current={plan.currentPerformance ?? plan.stockPerformance}
                predicted={plan.predictedPerformance ?? plan.stockPerformance}
              />
            </div>
          )}

          {/* Build Outcome Prediction */}
          {plan && plan.buildOutcome && (
            <div className="panel p-5">
              <div className="rev-line mb-3" />
              <h2 className="font-display text-lg font-bold mb-4">BUILD OUTCOME PREDICTION</h2>
              <div className="grid grid-cols-1 gap-3">
                <OutcomeCard icon="🏎️" label="Top Speed Gain"          value={plan.buildOutcome.topSpeedGain} color="text-accent" />
                <OutcomeCard icon="⚡" label="Acceleration Gain"        value={plan.buildOutcome.accelGain} color="text-amber-400" />
                <OutcomeCard icon="🎛️" label="Throttle Improvement"    value={plan.buildOutcome.throttleImprovement} color="text-sky-400" />
                <OutcomeCard icon="🛡️" label="Reliability"             value={plan.buildOutcome.reliabilityImpact} color="text-emerald-400" />
                <OutcomeCard icon="🏍️" label="Riding Feel"             value={plan.buildOutcome.ridingFeel} color="text-purple-400" />
                {plan.totalRange && !plan.hidePricing && plan.totalRange.max > 0 && (
                  <OutcomeCard icon="💸" label="Estimated Budget Range"
                    value={`₱${plan.totalRange.min.toLocaleString()} – ₱${plan.totalRange.max.toLocaleString()}`}
                    color="text-accent2" />
                )}
              </div>
            </div>
          )}
        </section>

        {/* RIGHT: Chat memory */}
        <section className="lg:col-span-3 panel p-4 flex flex-col h-[70vh] sticky top-20">
          <div className="rev-line mb-3" />
          <h2 className="font-display text-lg font-bold mb-2">MECHANIC CHAT</h2>
          <p className="text-xs text-chrome/60 mb-2">Memory enabled — previous turns are remembered.</p>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {messages.length === 0 && <div className="text-xs text-chrome/50">Ask anything: "Will roller weights void warranty?" "Cheaper alternative for the exhaust?"</div>}
            {messages.map((m, i) => (
              <div key={i} className={`rounded-lg p-2 text-sm ${m.role === 'user' ? 'bg-accent/15 ml-4' : 'bg-panel2 mr-4'}`}>
                <div className="text-[10px] uppercase tracking-wider opacity-60">{m.role}</div>
                <div className="whitespace-pre-wrap">{m.role === 'assistant' ? stripMarkdown(m.content) : m.content}</div>
              </div>
            ))}
            {chatLoading && <div className="text-xs text-chrome/60">⚙ Thinking…</div>}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2 mt-2">
            <input className="field" placeholder="Ask the mechanic…"
              value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()} />
            <button className="btn-rev !px-3 !py-2" onClick={sendChat} disabled={chatLoading}>Send</button>
          </div>
        </section>
      </main>

      {/* CART DRAWER */}
      {showCart && (
        <Modal onClose={() => setShowCart(false)} title="🧰 Build Sheet / Cart">
          {cart.length === 0 && <p className="text-chrome/70 text-sm">Your cart is empty. Click the <b>+</b> button next to any recommended part.</p>}
          {cart.length > 0 && (
            <>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {cart.map(c => {
                  const l = marketplaceLinks(c.searchQuery);
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-panel2 border border-white/5">
                      <div className="flex-1">
                        <div className="font-bold text-sm">{c.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {c.brand && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent/20 text-accent">{c.brand}</span>}
                          {c.tierLabel && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/5 text-chrome/70">{c.tierLabel}</span>}
                        </div>
                        <div className="text-xs text-chrome/70 mt-0.5">{c.reason}</div>
                        <div className="text-xs mt-1 flex gap-2">
                          <a className="underline text-orange-400" href={l.shopee} target="_blank">Shopee</a>
                          <a className="underline text-blue-400" href={l.lazada} target="_blank">Lazada</a>
                          <a className="underline text-pink-400" href={l.tiktok} target="_blank">TikTok</a>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-display font-bold">₱{c.estCostPHP.toLocaleString()}</div>
                        {c.priceMin !== c.priceMax && (
                          <div className="text-[10px] text-chrome/50">₱{c.priceMin.toLocaleString()}–₱{c.priceMax.toLocaleString()}</div>
                        )}
                      </div>
                      <button className="text-chrome/60 hover:text-accent" onClick={() => removeFromCart(c.id)}>✕</button>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-4 border-t border-white/10 pt-3">
                <span className="font-display">CART TOTAL</span>
                <div className="text-right">
                  <div className="font-display font-bold text-xl">₱{cartTotal.toLocaleString()}</div>
                  {cartRangeMin !== cartRangeMax && (
                    <div className="text-xs text-chrome/60">Range: ₱{cartRangeMin.toLocaleString()} – ₱{cartRangeMax.toLocaleString()}</div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="btn-rev flex-1" onClick={() => window.print()}>🖨 Print Receipt (1 page)</button>
                <button className="px-3 py-2 rounded-lg bg-panel2 border border-white/10 text-sm" onClick={() => setCart([])}>Clear cart</button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* ITEM DETAIL MODAL */}
      {selectedItem && (
        <Modal onClose={() => setSelectedItem(null)} title={`📋 ${selectedItem.name}`}>
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedItem.brand && (
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-accent/20 text-accent border border-accent/30">
                  {selectedItem.brand}
                </span>
              )}
              {selectedItem.tierLabel && (
                <span className={`text-xs uppercase tracking-wider px-2.5 py-1 rounded-full font-semibold ${selectedItem.tierLabel === 'Premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : selectedItem.tierLabel === 'Mid-Range' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                  {selectedItem.tierLabel}
                </span>
              )}
              <span className="text-xs uppercase tracking-wider px-2.5 py-1 rounded bg-white/5 text-chrome">{selectedItem.category}</span>
            </div>

            {/* Description */}
            {selectedItem.reason?.trim() && (
              <div>
                <div className="text-xs uppercase tracking-wider text-chrome/60 mb-1">Why This Part</div>
                <p className="text-sm leading-relaxed">{selectedItem.reason}</p>
              </div>
            )}

            {/* Performance Stats */}
            {selectedItem.performanceImpact && (
              <div className="rounded-xl border border-white/5 bg-panel2/60 p-4">
                <div className="text-xs uppercase tracking-wider text-chrome/60 mb-3">Performance Impact</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-accent font-display font-bold text-lg">+{selectedItem.performanceImpact.topSpeedDelta}</div>
                    <div className="text-[10px] text-chrome/60">km/h Top Speed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-amber-400 font-display font-bold text-lg">+{selectedItem.performanceImpact.accelPct}%</div>
                    <div className="text-[10px] text-chrome/60">Acceleration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sky-400 font-display font-bold text-lg">+{selectedItem.performanceImpact.throttlePct}%</div>
                    <div className="text-[10px] text-chrome/60">Throttle Resp.</div>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <span className="perf-badge">📈 {selectedItem.performanceImpact.label}</span>
                </div>
              </div>
            )}

            {/* Compatibility & Synergy */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/5 bg-panel2/60 p-3">
                <div className="text-[10px] uppercase tracking-wider text-chrome/60 mb-1">Compatibility</div>
                <div className={`font-display font-bold ${selectedItem.compatibilityScore === 'High' ? 'text-emerald-400' : selectedItem.compatibilityScore === 'Medium' ? 'text-amber-400' : 'text-red-400'}`}>
                  {selectedItem.compatibilityScore}
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-panel2/60 p-3">
                <div className="text-[10px] uppercase tracking-wider text-chrome/60 mb-1">Priority</div>
                <div className="font-display font-bold text-accent">#{selectedItem.priority}</div>
              </div>
            </div>

            {selectedItem.synergyNote && (
              <div className="synergy-pill">💡 {selectedItem.synergyNote}</div>
            )}

            {/* Price & Buy */}
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
              <div className="flex items-center justify-between">
                {!plan?.hidePricing && (
                  <div>
                    <div className="text-xs text-chrome/60">Estimated Price Range</div>
                    <div className="font-display font-bold text-xl mt-0.5">
                      ₱{selectedItem.priceRange ? `${selectedItem.priceRange.min.toLocaleString()} – ₱${selectedItem.priceRange.max.toLocaleString()}` : selectedItem.estCostPHP.toLocaleString()}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => { addToCart(selectedItem); setSelectedItem(null); }}
                  className="btn-rev !text-sm ml-auto">+ Add to Cart</button>
              </div>
            </div>

            {!plan?.hidePricing && (
              <div className="flex flex-wrap gap-2">
                {(() => { const l = marketplaceLinks(selectedItem.searchQuery); return (<>
                  <a className="flex-1 text-center px-3 py-2 rounded-lg bg-orange-600/80 hover:bg-orange-600 text-sm font-bold" href={l.shopee} target="_blank" rel="noreferrer">🛒 Shopee</a>
                  <a className="flex-1 text-center px-3 py-2 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-sm font-bold" href={l.lazada} target="_blank" rel="noreferrer">🛍 Lazada</a>
                  <a className="flex-1 text-center px-3 py-2 rounded-lg bg-pink-600/80 hover:bg-pink-600 text-sm font-bold" href={l.tiktok} target="_blank" rel="noreferrer">🎵 TikTok Shop</a>
                </>); })()}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* SETTINGS */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* ABOUT / HELP */}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {/* PRINT AREA - hidden on screen, visible on print */}
      <PrintReceipt cart={cart} input={input} total={cartTotal} totalMin={cartRangeMin} totalMax={cartRangeMax} plan={plan} />

      {/* Bottom-left subtle API Keys button */}
      <button
        onClick={() => setShowSettings(true)}
        className="fixed bottom-4 left-4 z-20 text-[10px] uppercase tracking-wider text-chrome/30 hover:text-chrome/60 transition-colors no-print"
      >🔑 API Keys</button>

      {/* Bottom-right help button */}
      <button
        onClick={() => setShowAbout(true)}
        title="About RevMind"
        aria-label="About RevMind"
        className="help-fab no-print"
      >?</button>

      <footer className="text-center text-xs text-chrome/40 py-6">
        RevMind v2.0 · Built for moto enthusiasts 🇵🇭 · Memory stored locally in your browser
      </footer>
    </div>
  );
}

/* -------- Build Outcome card -------- */
function OutcomeCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-panel2/70 border border-white/5 p-3">
      <span className="text-xl shrink-0">{icon}</span>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-chrome/60">{label}</div>
        <div className={`text-sm font-bold mt-0.5 ${color}`}>{value}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-chrome/70">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 no-print" onClick={onClose}>
      <div className="panel p-5 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-chrome/60 hover:text-accent text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} title="About RevMind">
      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          <b>RevMind</b> is an AI motorcycle modification agent built for Filipino riders.
          It helps you plan upgrades for scooters and underbone bikes based on your model, budget, goals, and riding style.
        </p>
        <div>
          <div className="text-xs uppercase tracking-wider text-chrome/60 mb-1">What the agent does</div>
          <ul className="list-disc pl-5 space-y-1 text-chrome/90">
            <li>Analyzes your rider profile and existing mods</li>
            <li>Recommends prioritized parts within your budget</li>
            <li>Estimates performance impact (speed, acceleration, throttle, stability)</li>
            <li>Lets you chat with a mechanic-style assistant for tips and guidance</li>
            <li>Builds a cart and printable build sheet for your mechanic</li>
          </ul>
        </div>
        <div className="rounded-xl border border-white/5 bg-panel2/60 p-4">
          <div className="text-xs uppercase tracking-wider text-chrome/60 mb-1">Created by</div>
          <p className="font-display font-bold text-accent">Jonathan Charles N. Rugayan</p>
          <p className="text-chrome/70 mt-1">For the <b>ANALYTICS 4</b> project</p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-chrome/60 mb-1">Tech stack</div>
          <ul className="list-disc pl-5 space-y-1 text-chrome/90">
            <li>React 18 + TypeScript</li>
            <li>Vite (build tool & dev server)</li>
            <li>Tailwind CSS (UI styling)</li>
            <li>Google Gemini API (Mechanic Chat)</li>
            <li>Groq API (Run Agent / plan reasoning)</li>
            <li>Browser localStorage (chat memory, cart, and settings)</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [chatCfg, setChatCfgLocal] = useState<ProviderConfig>(getChatConfig());
  const [agentCfg, setAgentCfgLocal] = useState<ProviderConfig>(getAgentConfig());

  function save() {
    setChatConfig(chatCfg);
    setAgentConfig(agentCfg);
    onClose();
  }

  return (
    <Modal onClose={onClose} title="⚙ AI Provider Settings">
      <div className="space-y-5 text-sm">
        <p className="text-chrome/70">RevMind works offline with rule-based plans. For full AI reasoning, paste your API keys below. Keys are stored only in your browser — never sent to us.</p>

        {/* Provider 1: Main Chatbot */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">💬</span>
            <div>
              <div className="font-display font-bold text-sm text-sky-400">MAIN CHATBOT</div>
              <div className="text-[10px] text-chrome/50">Powers the Mechanic Chat panel</div>
            </div>
          </div>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-chrome/70">Provider Base URL</span>
            <input className="field mt-1" value={chatCfg.baseUrl} onChange={e => setChatCfgLocal({ ...chatCfg, baseUrl: e.target.value })} placeholder="https://generativelanguage.googleapis.com/v1beta/openai" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-chrome/70">Model</span>
            <input className="field mt-1" value={chatCfg.model} onChange={e => setChatCfgLocal({ ...chatCfg, model: e.target.value })} placeholder="gemini-2.5-flash" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-chrome/70">API Key</span>
            <input type="password" className="field mt-1" value={chatCfg.apiKey} onChange={e => setChatCfgLocal({ ...chatCfg, apiKey: e.target.value })} placeholder="Paste your Gemini API key…" />
          </label>
        </div>

        {/* Provider 2: Reasoning Agent */}
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧠</span>
            <div>
              <div className="font-display font-bold text-sm text-accent">REASONING AGENT</div>
              <div className="text-[10px] text-chrome/50">Powers the Run Agent plan generation</div>
            </div>
          </div>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-chrome/70">Provider Base URL</span>
            <input className="field mt-1" value={agentCfg.baseUrl} onChange={e => setAgentCfgLocal({ ...agentCfg, baseUrl: e.target.value })} placeholder="https://api.groq.com/openai/v1" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-chrome/70">Model</span>
            <input className="field mt-1" value={agentCfg.model} onChange={e => setAgentCfgLocal({ ...agentCfg, model: e.target.value })} placeholder="llama-3.3-70b-versatile" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-chrome/70">API Key</span>
            <input type="password" className="field mt-1" value={agentCfg.apiKey} onChange={e => setAgentCfgLocal({ ...agentCfg, apiKey: e.target.value })} placeholder="Paste your Groq API key…" />
          </label>
        </div>

        <button className="btn-rev w-full" onClick={save}>💾 Save Both Providers</button>
        <p className="text-[10px] text-chrome/40 text-center">If only one key is set, that provider will be used for both chat and agent. If neither is set, offline rule-based mode is used.</p>
      </div>
    </Modal>
  );
}

function PrintReceipt({
  cart, input, total, totalMin, totalMax, plan,
}: {
  cart: CartItem[];
  input: RiderInput;
  total: number;
  totalMin: number;
  totalMax: number;
  plan: AgentPlan | null;
}) {
  const date = new Date().toLocaleString();
  return (
    <div id="print-area" style={{ display: 'none' }}>
      <style>{`
        #print-area { display: none; }
        @media print { #print-area { display: block !important; font-family: system-ui, sans-serif; color:#000; } }
        #print-area h1 { font-size: 22px; margin: 0; }
        #print-area .sub { font-size: 12px; color:#555; }
        #print-area table { width:100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
        #print-area th, #print-area td { border-bottom: 1px solid #ddd; padding: 6px 4px; text-align: left; }
        #print-area .total { font-weight: bold; font-size: 16px; margin-top: 10px; text-align: right; }
        #print-area .box { border: 1px solid #000; padding: 10px; margin-top: 10px; font-size: 12px; }
        #print-area .perf-table td { border: 1px solid #ccc; padding: 4px 8px; font-size: 11px; }
        #print-area .perf-table th { background: #f0f0f0; border: 1px solid #ccc; padding: 4px 8px; font-size: 11px; }
      `}</style>
      <div style={{ borderBottom: '2px solid #000', paddingBottom: 8 }}>
        <h1>🏍 RevMind — Mechanic Build Sheet</h1>
        <div className="sub">Generated {date}</div>
      </div>
      <div className="box">
        <div><b>Motorcycle:</b> {input.model} ({input.year}) · <b>Mileage:</b> {input.mileage} km</div>
        <div><b>Goal:</b> {input.goal} · <b>Budget:</b> PHP {input.budgetPHP?.toLocaleString()}</div>
        <div><b>Riding style:</b> {input.ridingStyle}</div>
        {input.existingMods && <div><b>Existing mods:</b> {input.existingMods}</div>}
      </div>
      <table>
        <thead><tr><th>#</th><th>Part</th><th>Brand</th><th>Reason</th><th style={{ textAlign: 'right' }}>Price Range (PHP)</th></tr></thead>
        <tbody>
          {cart.map((c, i) => (
            <tr key={c.id}>
              <td>{i + 1}</td>
              <td><b>{c.name}</b></td>
              <td>{c.brand}</td>
              <td>{c.reason}</td>
              <td style={{ textAlign: 'right' }}>
                {c.priceMin && c.priceMax && c.priceMin !== c.priceMax
                  ? `${c.priceMin.toLocaleString()} – ${c.priceMax.toLocaleString()}`
                  : c.estCostPHP.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="total">
        TOTAL: PHP {total.toLocaleString()}
        {totalMin !== totalMax && <span style={{ fontWeight: 'normal', fontSize: 12, color: '#555' }}> (Range: PHP {totalMin.toLocaleString()} – PHP {totalMax.toLocaleString()})</span>}
      </div>

      {/* Performance section in print */}
      {plan && plan.stockPerformance && (
        <div style={{ marginTop: 14 }}>
          <b style={{ fontSize: 13 }}>Performance Summary</b>
          <table className="perf-table" style={{ marginTop: 6 }}>
            <thead>
              <tr><th>Metric</th><th>Stock</th><th>Current Setup</th><th>Predicted Build</th></tr>
            </thead>
            <tbody>
              <tr><td>Top Speed</td><td>{plan.stockPerformance.topSpeedKmh} km/h</td><td>{plan.currentPerformance?.topSpeedKmh ?? '—'} km/h</td><td>{plan.predictedPerformance?.topSpeedKmh ?? '—'} km/h</td></tr>
              <tr><td>0–60 Accel</td><td>{plan.stockPerformance.accel0to60 > 0 ? `${plan.stockPerformance.accel0to60}s` : '—'}</td><td>{plan.currentPerformance?.accel0to60 > 0 ? `${plan.currentPerformance.accel0to60}s` : '—'}</td><td>{plan.predictedPerformance?.accel0to60 > 0 ? `${plan.predictedPerformance.accel0to60}s` : '—'}</td></tr>
              <tr><td>Fuel Efficiency</td><td>{plan.stockPerformance.fuelEfficiency} km/L</td><td>{plan.currentPerformance?.fuelEfficiency ?? '—'} km/L</td><td>{plan.predictedPerformance?.fuelEfficiency ?? '—'} km/L</td></tr>
            </tbody>
          </table>
          {plan.buildOutcome && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              <b>Build Outcome:</b> {plan.buildOutcome.topSpeedGain} · {plan.buildOutcome.accelGain} · {plan.buildOutcome.ridingFeel}
            </div>
          )}
        </div>
      )}

      <div className="box">
        <b>For the mechanic:</b> please source/install the items above. Verify compatibility with the listed motorcycle model &amp; year before installation. Customer to confirm brand variants in person.
      </div>
      <div style={{ marginTop: 16, fontSize: 10, color: '#666', textAlign: 'center' }}>
        Generated by RevMind AI Agent v2.0 · revmind.local
      </div>
    </div>
  );
}

function loadLS<T>(k: string, fallback: T): T {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function saveLS(k: string, v: any) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } }
