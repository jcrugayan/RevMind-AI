// RevMind Agent — reasoning + recommendation engine
// Uses an OpenAI-compatible Chat Completions endpoint.
// Falls back to a deterministic rule-based recommender when no API key is set.

export type RiderInput = {
  model: string;
  year: string;
  mileage: string;
  budgetPHP: number;
  goal: string;
  ridingStyle: string;
  existingMods: string;
};

export type PriceRange = { min: number; max: number };

export type PerformanceMetrics = {
  topSpeedKmh: number;
  accel0to60: number;       // seconds (0 = not applicable)
  accel0to100: number;      // seconds (0 = not applicable)
  throttleResponse: number; // 1-100 score
  midrangePull: number;     // 1-100 score
  highSpeedStability: number; // 1-100 score
  fuelEfficiency: number;   // km/L
};

export type ModEffect = {
  modName: string;
  topSpeedDelta: number;
  accelPct: number;
  throttlePct: number;
  fuelPct: number;
  midrangePct: number;
  stabilityPct: number;
  category: string;
};

export type SetupAnalysis = {
  detectedMods: ModEffect[];
  synergies: string[];
  conflicts: string[];
  currentPerformance: PerformanceMetrics;
};

export type Recommendation = {
  name: string;
  brand: string;
  tierLabel: string;
  reason: string;
  estCostPHP: number;
  priceRange: PriceRange;
  category: string;
  priority: number;
  searchQuery: string;
  performanceImpact: {
    topSpeedDelta: number;
    accelPct: number;
    throttlePct: number;
    label: string;
  };
  compatibilityScore: 'High' | 'Medium' | 'Low';
  synergyNote: string;
};

export type BuildOutcome = {
  topSpeedGain: string;
  accelGain: string;
  throttleImprovement: string;
  reliabilityImpact: string;
  ridingFeel: string;
};

export type AgentPlan = {
  analysis: string;
  recommendations: Recommendation[];
  totalPHP: number;
  totalRange: PriceRange;
  notes: string;
  /** Chat-synced plans: item names only, no prices in Agent Plan UI */
  hidePricing?: boolean;
  setupAnalysis: SetupAnalysis;
  stockPerformance: PerformanceMetrics;
  currentPerformance: PerformanceMetrics;
  predictedPerformance: PerformanceMetrics;
  buildOutcome: BuildOutcome;
};

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

/* -------- Riding Styles -------- */
export const RIDING_STYLES = [
  'Daily Commuting',
  'Weekend Riding',
  'Aggressive Street Riding',
  'Drag Racing',
  'Circuit Racing',
  'Track Racing',
  'Touring / Long Distance',
  'Fuel Economy Build',
  'Indonesian Concept',
  'Malaysian Concept',
  'Thai Concept',
  'Custom Show Build',
];

/* -------- Budget tier detection -------- */
type BudgetTier = 'budget' | 'mid' | 'premium';

function detectTier(budgetPHP: number): BudgetTier {
  if (budgetPHP <= 5000) return 'budget';
  if (budgetPHP <= 15000) return 'mid';
  return 'premium';
}

const TIER_LABELS: Record<BudgetTier, string> = {
  budget: 'Budget Pick',
  mid: 'Mid-Range',
  premium: 'Premium',
};

/* -------- Stock Performance Database -------- */
const STOCK_PERF: Record<string, PerformanceMetrics> = {
  'yamaha aerox 155': { topSpeedKmh: 120, accel0to60: 5.8, accel0to100: 14.2, throttleResponse: 62, midrangePull: 60, highSpeedStability: 65, fuelEfficiency: 42 },
  'yamaha nmax 155':  { topSpeedKmh: 118, accel0to60: 6.2, accel0to100: 15.5, throttleResponse: 60, midrangePull: 62, highSpeedStability: 70, fuelEfficiency: 40 },
  'yamaha mio sporty':{ topSpeedKmh:  95, accel0to60: 8.5, accel0to100: 0,    throttleResponse: 50, midrangePull: 48, highSpeedStability: 52, fuelEfficiency: 50 },
  'yamaha sniper 155':{ topSpeedKmh: 130, accel0to60: 5.2, accel0to100: 12.5, throttleResponse: 70, midrangePull: 68, highSpeedStability: 72, fuelEfficiency: 38 },
  'honda click 125':  { topSpeedKmh: 100, accel0to60: 7.2, accel0to100: 0,    throttleResponse: 52, midrangePull: 50, highSpeedStability: 58, fuelEfficiency: 55 },
  'honda click 160':  { topSpeedKmh: 115, accel0to60: 6.0, accel0to100: 15.0, throttleResponse: 60, midrangePull: 58, highSpeedStability: 62, fuelEfficiency: 48 },
  'honda adv 160':    { topSpeedKmh: 112, accel0to60: 6.5, accel0to100: 16.0, throttleResponse: 58, midrangePull: 56, highSpeedStability: 75, fuelEfficiency: 45 },
  'honda pcx 160':    { topSpeedKmh: 110, accel0to60: 6.8, accel0to100: 16.5, throttleResponse: 56, midrangePull: 55, highSpeedStability: 72, fuelEfficiency: 50 },
  'honda beat':       { topSpeedKmh:  90, accel0to60: 9.0, accel0to100: 0,    throttleResponse: 48, midrangePull: 46, highSpeedStability: 50, fuelEfficiency: 58 },
  'honda rs125':      { topSpeedKmh: 110, accel0to60: 7.0, accel0to100: 0,    throttleResponse: 58, midrangePull: 55, highSpeedStability: 60, fuelEfficiency: 45 },
  'honda xrm 125':    { topSpeedKmh: 105, accel0to60: 7.5, accel0to100: 0,    throttleResponse: 55, midrangePull: 52, highSpeedStability: 58, fuelEfficiency: 48 },
  'honda wave 110':   { topSpeedKmh:  95, accel0to60: 9.5, accel0to100: 0,    throttleResponse: 46, midrangePull: 44, highSpeedStability: 52, fuelEfficiency: 62 },
  'suzuki raider r150':{ topSpeedKmh:125, accel0to60: 5.5, accel0to100: 12.0, throttleResponse: 68, midrangePull: 66, highSpeedStability: 70, fuelEfficiency: 38 },
  'suzuki burgman street 125':{ topSpeedKmh:100, accel0to60:7.5, accel0to100:0, throttleResponse:52, midrangePull:50, highSpeedStability:68, fuelEfficiency:50 },
  'kawasaki rouser ns160':{ topSpeedKmh:128, accel0to60:5.4, accel0to100:13.0, throttleResponse:70, midrangePull:68, highSpeedStability:72, fuelEfficiency:38 },
};

function getStockPerf(model: string): PerformanceMetrics {
  const key = model.toLowerCase();
  // Exact match
  if (STOCK_PERF[key]) return { ...STOCK_PERF[key] };
  // Fuzzy match
  for (const k of Object.keys(STOCK_PERF)) {
    if (key.includes(k) || k.includes(key.split(' ')[0])) return { ...STOCK_PERF[k] };
  }
  // Generic fallback
  return { topSpeedKmh: 110, accel0to60: 6.5, accel0to100: 15.0, throttleResponse: 55, midrangePull: 55, highSpeedStability: 60, fuelEfficiency: 45 };
}

/* -------- Existing Mods Parser -------- */
const MOD_CATALOG: Array<{ keywords: string[]; effect: ModEffect }> = [
  {
    keywords: ['roller weight', 'roller', 'cvt roller'],
    effect: { modName: 'CVT Roller Weights', topSpeedDelta: 2, accelPct: 8, throttlePct: 12, fuelPct: -3, midrangePct: 10, stabilityPct: 0, category: 'cvt' },
  },
  {
    keywords: ['clutch spring', 'clutch bell spring'],
    effect: { modName: 'Clutch Springs', topSpeedDelta: 1, accelPct: 6, throttlePct: 8, fuelPct: -2, midrangePct: 7, stabilityPct: 0, category: 'cvt' },
  },
  {
    keywords: ['cvt kit', 'variator kit', 'racing cvt'],
    effect: { modName: 'CVT Kit', topSpeedDelta: 4, accelPct: 12, throttlePct: 15, fuelPct: -5, midrangePct: 14, stabilityPct: 0, category: 'cvt' },
  },
  {
    keywords: ['pod filter', 'open air', 'open pod'],
    effect: { modName: 'Open Pod Filter', topSpeedDelta: 3, accelPct: 5, throttlePct: 10, fuelPct: -6, midrangePct: 8, stabilityPct: 0, category: 'intake' },
  },
  {
    keywords: ['air filter', 'high flow filter', 'ferrox', 'k&n'],
    effect: { modName: 'High-Flow Air Filter', topSpeedDelta: 2, accelPct: 3, throttlePct: 7, fuelPct: -2, midrangePct: 5, stabilityPct: 0, category: 'intake' },
  },
  {
    keywords: ['racing cdi', 'cdi', 'ecu', 'aracer', 'ara racing'],
    effect: { modName: 'Racing CDI/ECU', topSpeedDelta: 5, accelPct: 8, throttlePct: 14, fuelPct: -4, midrangePct: 10, stabilityPct: 0, category: 'electrical' },
  },
  {
    keywords: ['exhaust', 'pipe', 'muffler', 'slip-on', 'full system', 'r9', 'apido', 'ahm pipe'],
    effect: { modName: 'Performance Exhaust', topSpeedDelta: 4, accelPct: 6, throttlePct: 9, fuelPct: -5, midrangePct: 12, stabilityPct: 0, category: 'exhaust' },
  },
  {
    keywords: ['sprocket', 'chain sprocket'],
    effect: { modName: 'Sprocket Upgrade', topSpeedDelta: -3, accelPct: 14, throttlePct: 5, fuelPct: -3, midrangePct: 8, stabilityPct: 0, category: 'engine' },
  },
  {
    keywords: ['rear shock', 'shock absorber', 'yss', 'racing boy shock'],
    effect: { modName: 'Upgraded Rear Shock', topSpeedDelta: 0, accelPct: 0, throttlePct: 0, fuelPct: 0, midrangePct: 0, stabilityPct: 20, category: 'suspension' },
  },
  {
    keywords: ['iridium plug', 'spark plug', 'iridium spark'],
    effect: { modName: 'Iridium Spark Plug', topSpeedDelta: 1, accelPct: 2, throttlePct: 5, fuelPct: 3, midrangePct: 3, stabilityPct: 0, category: 'engine' },
  },
  {
    keywords: ['synthetic oil', 'full synthetic', 'motul 7100', 'motul 3100'],
    effect: { modName: 'Performance Engine Oil', topSpeedDelta: 0, accelPct: 1, throttlePct: 3, fuelPct: 4, midrangePct: 2, stabilityPct: 0, category: 'engine' },
  },
  {
    keywords: ['torque drive', 'torque spring'],
    effect: { modName: 'Torque Drive', topSpeedDelta: 2, accelPct: 7, throttlePct: 6, fuelPct: -2, midrangePct: 8, stabilityPct: 0, category: 'cvt' },
  },
];

function parseExistingMods(existingMods: string): ModEffect[] {
  if (!existingMods.trim()) return [];
  const lower = existingMods.toLowerCase();
  const found: ModEffect[] = [];
  for (const entry of MOD_CATALOG) {
    if (entry.keywords.some(k => lower.includes(k))) {
      found.push(entry.effect);
    }
  }
  return found;
}

function detectSynergies(mods: ModEffect[]): string[] {
  const cats = mods.map(m => m.category);
  const synergies: string[] = [];
  if (cats.includes('intake') && cats.includes('exhaust')) synergies.push('🔥 Intake + Exhaust combo — strong airflow synergy, expect +15-20% power gains');
  if (cats.includes('cvt') && cats.includes('exhaust')) synergies.push('⚡ CVT Kit + Exhaust — excellent launch-to-top-end synergy');
  if (cats.includes('electrical') && cats.includes('intake')) synergies.push('💡 ECU/CDI + Air Filter — ignition timing optimized for increased airflow');
  if (cats.includes('cvt') && cats.includes('electrical')) synergies.push('🏁 CVT + ECU combo — maximizes rev limit removal with optimized power band');
  if (mods.length >= 3) synergies.push('✅ Multi-mod setup detected — compounding performance gains expected');
  return synergies;
}

function detectConflicts(mods: ModEffect[], existingModsRaw: string): string[] {
  const lower = existingModsRaw.toLowerCase();
  const conflicts: string[] = [];
  const hasECU = lower.includes('cdi') || lower.includes('ecu') || lower.includes('aracer');
  const hasStockAirbox = !lower.includes('filter') && !lower.includes('pod') && !lower.includes('k&n');
  if (hasECU && hasStockAirbox) conflicts.push('⚠️ ECU/CDI with stock airbox — intake is a bottleneck; add air filter upgrade for full gains');
  const hasPipe = lower.includes('exhaust') || lower.includes('pipe') || lower.includes('muffler');
  const hasStockECU = !hasECU;
  if (hasPipe && hasStockECU) conflicts.push('⚠️ Performance exhaust with stock ECU — ECU upgrade needed for optimal fueling and timing');
  return conflicts;
}

function applyModsToPerf(base: PerformanceMetrics, mods: ModEffect[]): PerformanceMetrics {
  let p = { ...base };
  for (const m of mods) {
    p.topSpeedKmh = Math.round((p.topSpeedKmh + m.topSpeedDelta) * 10) / 10;
    p.accel0to60  = p.accel0to60  > 0 ? Math.round(p.accel0to60  * (1 - m.accelPct / 100) * 100) / 100 : 0;
    p.accel0to100 = p.accel0to100 > 0 ? Math.round(p.accel0to100 * (1 - m.accelPct / 100) * 100) / 100 : 0;
    p.throttleResponse  = Math.min(100, Math.round(p.throttleResponse  * (1 + m.throttlePct  / 100)));
    p.midrangePull      = Math.min(100, Math.round(p.midrangePull      * (1 + m.midrangePct  / 100)));
    p.highSpeedStability= Math.min(100, Math.round(p.highSpeedStability* (1 + m.stabilityPct / 100)));
    p.fuelEfficiency    = Math.max(20,  Math.round(p.fuelEfficiency    * (1 + m.fuelPct      / 100) * 10) / 10);
  }
  return p;
}

function applyRecsToPerf(base: PerformanceMetrics, recs: Recommendation[]): PerformanceMetrics {
  let p = { ...base };
  for (const r of recs) {
    p.topSpeedKmh = Math.round((p.topSpeedKmh + r.performanceImpact.topSpeedDelta) * 10) / 10;
    p.accel0to60  = p.accel0to60  > 0 ? Math.round(p.accel0to60  * (1 - r.performanceImpact.accelPct / 100) * 100) / 100 : 0;
    p.accel0to100 = p.accel0to100 > 0 ? Math.round(p.accel0to100 * (1 - r.performanceImpact.accelPct / 100) * 100) / 100 : 0;
    p.throttleResponse  = Math.min(100, Math.round(p.throttleResponse  * (1 + r.performanceImpact.throttlePct / 100)));
    p.midrangePull      = Math.min(100, p.midrangePull + (r.performanceImpact.topSpeedDelta > 0 ? 3 : 1));
    p.highSpeedStability= Math.min(100, p.highSpeedStability + (r.category === 'suspension' ? 8 : 1));
    p.fuelEfficiency    = Math.max(20, Math.round(p.fuelEfficiency * (r.category === 'engine' ? 1.01 : r.category === 'intake' ? 0.97 : 1.0) * 10) / 10);
  }
  return p;
}

/* -------- Brand catalog -------- */
type BrandVariant = { brand: string; product: string; priceMin: number; priceMax: number };
type BrandEntry = Record<BudgetTier, BrandVariant>;

// ----- CVT / Scooter-specific parts -----
const ROLLER_WEIGHTS: BrandEntry = {
  budget:  { brand: 'Generic',  product: 'Generic CVT Roller Weights',          priceMin: 200,  priceMax: 320 },
  mid:     { brand: 'TFC',      product: 'TFC Racing CVT Roller Weights',       priceMin: 380,  priceMax: 550 },
  premium: { brand: 'JVT',      product: 'JVT Performance CVT Roller Weights',  priceMin: 750,  priceMax: 980 },
};

const CLUTCH_SPRINGS: BrandEntry = {
  budget:  { brand: 'Generic',      product: 'Generic Clutch Springs (1500RPM)',     priceMin: 250,  priceMax: 380 },
  mid:     { brand: 'TFC',          product: 'TFC Racing Clutch Springs (1500RPM)',  priceMin: 450,  priceMax: 650 },
  premium: { brand: 'JVT',          product: 'JVT Performance Clutch Springs',      priceMin: 850,  priceMax: 1100 },
};

const TORQUE_DRIVE: BrandEntry = {
  budget:  { brand: 'Generic',   product: 'Generic Torque Drive Assembly',         priceMin: 500,  priceMax: 750 },
  mid:     { brand: 'MHR Racing', product: 'MHR Racing Torque Drive',             priceMin: 1000, priceMax: 1500 },
  premium: { brand: 'Daytona',   product: 'Daytona Performance Torque Drive',      priceMin: 1900, priceMax: 2600 },
};

// ----- Intake -----
const POD_FILTER: BrandEntry = {
  budget:  { brand: 'Generic',   product: 'Generic Open Pod Air Filter',           priceMin: 280,  priceMax: 430 },
  mid:     { brand: 'Ferrox',    product: 'Ferrox Stainless Steel Air Filter',     priceMin: 580,  priceMax: 850 },
  premium: { brand: 'K&N',       product: 'K&N High-Flow Air Filter',              priceMin: 1500, priceMax: 2200 },
};

const HIGH_FLOW_FILTER: BrandEntry = {
  budget:  { brand: 'Generic',    product: 'Generic High-Flow Air Filter Element',  priceMin: 320,  priceMax: 500 },
  mid:     { brand: 'Ferrox',     product: 'Ferrox Performance Air Filter',         priceMin: 750,  priceMax: 1100 },
  premium: { brand: 'K&N',        product: 'K&N Washable High-Flow Filter',        priceMin: 1900, priceMax: 2600 },
};

// ----- Electrical / ECU -----
const CDI_ECU: BrandEntry = {
  budget:  { brand: 'Generic',     product: 'Generic Racing CDI Unit',              priceMin: 950,  priceMax: 1500 },
  mid:     { brand: 'ARA Racing',  product: 'ARA Racing Performance CDI',           priceMin: 2000, priceMax: 3100 },
  premium: { brand: 'aRacer',      product: 'aRacer RC Mini ECU (Programmable)',    priceMin: 7500, priceMax: 9800 },
};

// ----- Exhaust -----
const EXHAUST_SCOOTER: BrandEntry = {
  budget:  { brand: 'Generic',  product: 'Generic Slip-on Muffler',                 priceMin: 1400, priceMax: 2300 },
  mid:     { brand: 'AHM',      product: 'AHM Performance Slip-on Exhaust',         priceMin: 2800, priceMax: 4400 },
  premium: { brand: 'R9',       product: 'R9 Misano Slip-on Performance Exhaust',   priceMin: 5500, priceMax: 7800 },
};

const EXHAUST_UNDERBONE: BrandEntry = {
  budget:  { brand: 'Generic',  product: 'Generic Slip-on Muffler',                 priceMin: 1600, priceMax: 2500 },
  mid:     { brand: 'AHM',      product: 'AHM Full-System Exhaust',                 priceMin: 3500, priceMax: 5500 },
  premium: { brand: 'Apido',    product: 'Apido Full-System Racing Exhaust',        priceMin: 6500, priceMax: 9500 },
};

// ----- Engine / Sprocket / Oil -----
const SPROCKET_SET: BrandEntry = {
  budget:  { brand: 'Generic',      product: 'Generic Steel Sprocket Set',           priceMin: 650,  priceMax: 980 },
  mid:     { brand: 'TK Racing',    product: 'TK Racing Sprocket Set',              priceMin: 1400, priceMax: 2200 },
  premium: { brand: 'JT Sprockets', product: 'JT Sprockets + DID Chain Kit',        priceMin: 2900, priceMax: 4200 },
};

const SPARK_PLUG: BrandEntry = {
  budget:  { brand: 'NGK',      product: 'NGK Standard Spark Plug',                 priceMin: 140,  priceMax: 230 },
  mid:     { brand: 'Denso',    product: 'Denso Iridium Power Spark Plug',          priceMin: 360,  priceMax: 560 },
  premium: { brand: 'NGK',      product: 'NGK Laser Iridium Spark Plug',            priceMin: 620,  priceMax: 900 },
};

const ENGINE_OIL: BrandEntry = {
  budget:  { brand: 'Castrol',  product: 'Castrol Activ 4T 10W-40 (Mineral)',       priceMin: 270,  priceMax: 430 },
  mid:     { brand: 'Motul',    product: 'Motul 3100 Gold 4T 10W-40 (Semi-Synth)',  priceMin: 520,  priceMax: 800 },
  premium: { brand: 'Motul',    product: 'Motul 7100 4T 10W-40 (Full Synthetic)',   priceMin: 900,  priceMax: 1350 },
};

// ----- Tires -----
const TIRES_ECO: BrandEntry = {
  budget:  { brand: 'CST',      product: 'CST Eco-Tour Tire Set',                   priceMin: 1400, priceMax: 2300 },
  mid:     { brand: 'IRC',      product: 'IRC Mobicity SCT Tire Set',               priceMin: 2800, priceMax: 4400 },
  premium: { brand: 'Michelin', product: 'Michelin City Grip 2 Tire Set',           priceMin: 4500, priceMax: 6800 },
};

const TIRES_PERF: BrandEntry = {
  budget:  { brand: 'CST',      product: 'CST Performance Tire Set',                priceMin: 1600, priceMax: 2500 },
  mid:     { brand: 'Maxxis',   product: 'Maxxis Victra S98 Tire Set',              priceMin: 3200, priceMax: 5000 },
  premium: { brand: 'Pirelli',  product: 'Pirelli Diablo Rosso Sport Tire Set',     priceMin: 5500, priceMax: 7800 },
};

// ----- Suspension -----
const REAR_SHOCK: BrandEntry = {
  budget:  { brand: 'Generic',      product: 'Generic Adjustable Rear Shock',       priceMin: 1400, priceMax: 2300 },
  mid:     { brand: 'Racing Boy',   product: 'Racing Boy (RCB) DB-2 Rear Shock',   priceMin: 3500, priceMax: 5500 },
  premium: { brand: 'YSS',          product: 'YSS G-Sport Adjustable Rear Shock',  priceMin: 7000, priceMax: 10000 },
};

// ----- Brakes -----
const BRAKE_PADS: BrandEntry = {
  budget:  { brand: 'Generic',      product: 'Generic Sintered Brake Pads',         priceMin: 280,  priceMax: 450 },
  mid:     { brand: 'Racing Boy',   product: 'Racing Boy (RCB) S-Series Brake Pads', priceMin: 560, priceMax: 880 },
  premium: { brand: 'Nissin',       product: 'Nissin Sintered Sport Brake Pads',    priceMin: 980,  priceMax: 1500 },
};

// ----- Comfort -----
const SEAT_COVER: BrandEntry = {
  budget:  { brand: 'Generic',   product: 'Generic Gel Comfort Seat Cover',         priceMin: 480,  priceMax: 750 },
  mid:     { brand: 'Custom',    product: 'Custom-Fit Gel Seat Cover',              priceMin: 950,  priceMax: 1500 },
  premium: { brand: 'JPA',       product: 'JPA Premium Gel Comfort Seat',           priceMin: 2000, priceMax: 3000 },
};

const WINDSHIELD: BrandEntry = {
  budget:  { brand: 'Generic',   product: 'Generic Acrylic Windshield',             priceMin: 650,  priceMax: 1000 },
  mid:     { brand: 'Custom',    product: 'Smoke-Tint Custom Windshield',           priceMin: 1700, priceMax: 2800 },
  premium: { brand: 'GIVI',      product: 'GIVI Sport Touring Windshield',          priceMin: 3800, priceMax: 5500 },
};

// ----- Aesthetics -----
const LED_HEADLIGHT: BrandEntry = {
  budget:  { brand: 'Generic',   product: 'Generic LED Headlight Bulb',             priceMin: 280,  priceMax: 450 },
  mid:     { brand: 'CREE',      product: 'CREE XHP50 LED Headlight Bulb',          priceMin: 680,  priceMax: 1050 },
  premium: { brand: 'Philips',   product: 'Philips Ultinon Pro LED Headlight',      priceMin: 1800, priceMax: 2800 },
};

const BAR_END_MIRRORS: BrandEntry = {
  budget:  { brand: 'Generic',   product: 'Generic CNC Bar-End Mirrors',            priceMin: 380,  priceMax: 650 },
  mid:     { brand: 'Rizoma Clone', product: 'CNC Rizoma-Style Bar-End Mirrors',    priceMin: 1200, priceMax: 1900 },
  premium: { brand: 'Rizoma',    product: 'Rizoma Spy-R Bar-End Mirrors',           priceMin: 3800, priceMax: 5500 },
};

const DECAL_KIT: BrandEntry = {
  budget:  { brand: 'Generic',    product: 'Generic Vinyl Decal Kit',               priceMin: 300,  priceMax: 520 },
  mid:     { brand: 'Custom',     product: 'Custom-Print Full Body Decal Kit',      priceMin: 720,  priceMax: 1100 },
  premium: { brand: 'Premium',    product: 'Premium 3M Vinyl Full Wrap Kit',        priceMin: 2000, priceMax: 3200 },
};

/* -------- Performance impact per part category -------- */
const PART_IMPACT: Record<string, { topSpeedDelta: number; accelPct: number; throttlePct: number; label: string }> = {
  cvt:        { topSpeedDelta: 3,  accelPct: 8,  throttlePct: 12, label: '+3 km/h Top Speed, +8% Accel' },
  intake:     { topSpeedDelta: 2,  accelPct: 4,  throttlePct: 9,  label: '+2 km/h Top Speed, +4% Accel' },
  exhaust:    { topSpeedDelta: 4,  accelPct: 6,  throttlePct: 9,  label: '+4 km/h Top Speed, +6% Accel' },
  electrical: { topSpeedDelta: 5,  accelPct: 8,  throttlePct: 14, label: '+5 km/h Top Speed, +8% Accel' },
  engine:     { topSpeedDelta: 1,  accelPct: 3,  throttlePct: 4,  label: '+1 km/h, Better Throttle' },
  suspension: { topSpeedDelta: 0,  accelPct: 0,  throttlePct: 0,  label: '+Stability & Handling' },
  brakes:     { topSpeedDelta: 0,  accelPct: 0,  throttlePct: 0,  label: '+Braking Confidence' },
  tires:      { topSpeedDelta: 0,  accelPct: 1,  throttlePct: 2,  label: '+Grip & Confidence' },
  aesthetics: { topSpeedDelta: 0,  accelPct: 0,  throttlePct: 0,  label: 'Visual Upgrade' },
  comfort:    { topSpeedDelta: 0,  accelPct: 0,  throttlePct: 0,  label: '+Ride Comfort' },
};

/* -------- Helper: build Recommendation from BrandEntry -------- */
function pick(
  entry: BrandEntry,
  tier: BudgetTier,
  model: string,
  category: string,
  priority: number,
  reason: string,
  compatibilityScore: 'High' | 'Medium' | 'Low' = 'High',
  synergyNote = '',
): Recommendation {
  const v = entry[tier];
  const midPrice = Math.round((v.priceMin + v.priceMax) / 2);
  const impact = PART_IMPACT[category] ?? { topSpeedDelta: 0, accelPct: 2, throttlePct: 3, label: 'Performance Upgrade' };
  return {
    name: v.product,
    brand: v.brand,
    tierLabel: TIER_LABELS[tier],
    reason,
    estCostPHP: midPrice,
    priceRange: { min: v.priceMin, max: v.priceMax },
    category,
    priority,
    searchQuery: `${model} ${v.brand} ${v.product}`.replace(/\(.*?\)/g, '').trim(),
    performanceImpact: { ...impact },
    compatibilityScore,
    synergyNote: synergyNote || defaultSynergy(category),
  };
}

function defaultSynergy(cat: string): string {
  const map: Record<string, string> = {
    cvt: 'Works best paired with exhaust upgrade',
    intake: 'Pair with exhaust for maximum airflow gains',
    exhaust: 'Synergy with intake/filter for balanced tuning',
    electrical: 'Multiplies gains from intake and exhaust',
    engine: 'Essential maintenance that unlocks all other gains',
    suspension: 'Improves high-speed stability after power mods',
    brakes: 'Critical safety upgrade to match increased power',
    tires: 'Foundation of all performance and safety',
    aesthetics: 'Visual upgrade, no perf impact',
    comfort: 'Enhances long-ride endurance',
  };
  return map[cat] ?? '';
}

/* -------- LLM prompts -------- */
const BASE_SYSTEM_PROMPT = `You are RevMind, an expert Filipino motorcycle mechanic and modification consultant.
You specialize in popular PH scooters and motorcycles (Honda Click 125/160, Yamaha Aerox 155, NMAX 155,
Honda ADV 160, PCX 160, Mio, Sniper, Raider, etc.) and street/underbone bikes.

You reason like an AGENT, not a chatbot. For every request, you must:
1) ANALYZE the rider's goal, motorcycle compatibility, mileage condition, and budget.
2) PLAN a prioritized modification roadmap (highest impact-per-peso first).
3) JUSTIFY each pick with a mechanical reason.
4) ESTIMATE realistic PH market prices in PHP as ranges (min and max).
5) STAY within budget. If the budget is tight, suggest fewer high-impact parts.
6) RECOMMEND SPECIFIC BRANDS appropriate to the budget tier:
   - Budget (≤PHP 5,000): Use affordable / generic / local brands (e.g. Generic, CST, NGK Standard).
   - Mid-range (PHP 5,001–15,000): Use proven aftermarket brands (e.g. TFC, Racing Boy, Ferrox, AHM, Maxxis, Denso, Motul 3100).
   - Premium (>PHP 15,000): Use top-tier brands (e.g. JVT, Daytona, R9, Apido, aRacer, K&N, YSS, Pirelli, Motul 7100, Philips).

Always remember prior turns in this conversation (the user may refine goals).`;

const AGENT_SYSTEM_PROMPT = `${BASE_SYSTEM_PROMPT}
When the user asks for a build plan, return STRICT JSON in the exact schema requested. No prose outside JSON.`;

const CHAT_SYSTEM_PROMPT = `You are RevMind, an expert Filipino motorcycle mechanic and modification consultant for popular PH scooters and motorcycles.

For mechanic chat:
- Focus on practical tips, what to do, installation order, safety notes, and riding advice.
- Explain clearly in plain conversational language like a real Filipino mechanic.
- You may mention specific part names when helpful.
- Do NOT include prices, PHP amounts, budget totals, or cost ranges in your reply (even if the user asks about budget, give guidance without listing peso amounts).
- When listing parts, use a short bullet list of part names only (no prices per line).
- Do not output JSON unless the user explicitly asks for JSON.`;

const PLAN_SCHEMA_INSTRUCTION = `Return ONLY valid minified JSON, no markdown fences, matching:
{
 "analysis": "2-4 sentence reasoning summary",
 "recommendations": [
   {"name":"Specific product name with brand","brand":"Brand name","tierLabel":"Budget Pick|Mid-Range|Premium","reason":"why","estCostPHP":number,"priceRange":{"min":number,"max":number},"category":"engine|cvt|intake|exhaust|suspension|brakes|electrical|aesthetics|comfort|tires","priority":1,"searchQuery":"brand + keywords","performanceImpact":{"topSpeedDelta":number,"accelPct":number,"throttlePct":number,"label":"summary"},"compatibilityScore":"High|Medium|Low","synergyNote":"note about synergy"}
 ],
 "totalPHP": number,
 "totalRange": {"min":number,"max":number},
 "notes": "installation tips, compatibility caveats"
}`;

/* ======== DUAL-PROVIDER CONFIG ======== */
// Provider 1: Main Chatbot (Gemini) — used for Mechanic Chat
// Provider 2: Secondary Reasoning (Groq) — used for Agent Plan generation

export type ProviderConfig = {
  baseUrl: string;
  model: string;
  apiKey: string;
};

// --- Provider 1: Main Chatbot (Gemini) ---
export function getChatConfig(): ProviderConfig {
  return {
    baseUrl: localStorage.getItem('revmind_chat_base_url') || 'https://generativelanguage.googleapis.com/v1beta/openai',
    model:   localStorage.getItem('revmind_chat_model')    || 'gemini-2.5-flash',
    apiKey:  localStorage.getItem('revmind_chat_api_key')   || '',
  };
}
export function setChatConfig(cfg: ProviderConfig) {
  localStorage.setItem('revmind_chat_base_url', cfg.baseUrl);
  localStorage.setItem('revmind_chat_model',    cfg.model);
  localStorage.setItem('revmind_chat_api_key',   cfg.apiKey);
}

// --- Provider 2: Reasoning Agent (Groq) ---
export function getAgentConfig(): ProviderConfig {
  return {
    baseUrl: localStorage.getItem('revmind_agent_base_url') || 'https://api.groq.com/openai/v1',
    model:   localStorage.getItem('revmind_agent_model')    || 'llama-3.3-70b-versatile',
    apiKey:  localStorage.getItem('revmind_agent_api_key')   || '',
  };
}
export function setAgentConfig(cfg: ProviderConfig) {
  localStorage.setItem('revmind_agent_base_url', cfg.baseUrl);
  localStorage.setItem('revmind_agent_model',    cfg.model);
  localStorage.setItem('revmind_agent_api_key',   cfg.apiKey);
}

// Legacy compatibility shims (for anything that still uses the old API)
export function getApiKey(): string { return getChatConfig().apiKey || getAgentConfig().apiKey; }
export function setApiKey(k: string) { setChatConfig({ ...getChatConfig(), apiKey: k }); }
export function getModel(): string { return getChatConfig().model; }
export function setModel(m: string) { setChatConfig({ ...getChatConfig(), model: m }); }
export function getBaseUrl(): string { return getChatConfig().baseUrl; }
export function setBaseUrl(u: string) { setChatConfig({ ...getChatConfig(), baseUrl: u }); }

/* -------- LLM call with provider routing -------- */
const CHAT_FALLBACK_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number) {
  return status === 429 || status === 500 || status === 502 || status === 503;
}

function formatLLMError(providerLabel: string, status: number, _body: string): Error {
  if (status === 503) {
    return new Error(
      `${providerLabel} is temporarily overloaded (503). This is on Google's side, not your app. Wait 10–30 seconds and send again, or in Settings change chat model to gemini-2.0-flash.`,
    );
  }
  if (status === 429) {
    return new Error(`${providerLabel} rate limit hit (429). Wait a minute, then try again.`);
  }
  return new Error(`${providerLabel} request failed (${status}). Check your API key and model name in Settings.`);
}

async function callLLMOnce(
  cfg: ProviderConfig,
  messages: ChatMessage[],
  jsonMode: boolean,
): Promise<{ ok: true; content: string } | { ok: false; status: number; body: string }> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: 0.4,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, status: res.status, body };
  }
  const j = await res.json();
  return { ok: true, content: j.choices?.[0]?.message?.content ?? '' };
}

async function callLLM(
  messages: ChatMessage[],
  jsonMode = false,
  provider: 'chat' | 'agent' = 'chat',
): Promise<string> {
  const baseCfg = provider === 'agent' ? getAgentConfig() : getChatConfig();
  if (!baseCfg.apiKey) throw new Error('NO_API_KEY');

  const providerLabel = provider === 'agent' ? 'Groq' : 'Gemini';
  const models =
    provider === 'chat'
      ? [baseCfg.model, ...CHAT_FALLBACK_MODELS.filter(m => m !== baseCfg.model)]
      : [baseCfg.model];

  let lastStatus = 0;
  let lastBody = '';

  for (const model of models) {
    const cfg = { ...baseCfg, model };
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await callLLMOnce(cfg, messages, jsonMode);
      if (result.ok) return result.content;

      lastStatus = result.status;
      lastBody = result.body;

      if (isRetryableStatus(result.status) && attempt < 2) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      break;
    }
  }

  throw formatLLMError(providerLabel, lastStatus, lastBody);
}

/* -------- Build setup analysis -------- */
function buildSetupAnalysis(input: RiderInput, stock: PerformanceMetrics): SetupAnalysis {
  const mods = parseExistingMods(input.existingMods);
  const synergies = detectSynergies(mods);
  const conflicts = detectConflicts(mods, input.existingMods);
  const currentPerformance = applyModsToPerf(stock, mods);
  return { detectedMods: mods, synergies, conflicts, currentPerformance };
}

/* -------- Generate build outcome text -------- */
function buildOutcomeSummary(
  stock: PerformanceMetrics,
  predicted: PerformanceMetrics,
  recs: Recommendation[],
): BuildOutcome {
  const speedGain = predicted.topSpeedKmh - stock.topSpeedKmh;
  const accelGain60  = stock.accel0to60  > 0 ? stock.accel0to60  - predicted.accel0to60  : 0;
  const throttleGain = predicted.throttleResponse - stock.throttleResponse;
  const hasBrakes    = recs.some(r => r.category === 'brakes');
  const hasExhaust   = recs.some(r => r.category === 'exhaust');
  const hasECU       = recs.some(r => r.category === 'electrical');
  const reliabilityMsg = hasBrakes
    ? 'Safety improved — upgraded brakes handle the added power'
    : 'Monitor brake performance after power gains';
  const feelMsg = (hasExhaust && hasECU)
    ? 'More aggressive power delivery with a satisfying exhaust note'
    : hasExhaust
    ? 'Noticeably smoother top-end pull with better exhaust note'
    : 'Improved throttle feel across the RPM range';
  return {
    topSpeedGain:        `+${speedGain} km/h (${stock.topSpeedKmh} → ${predicted.topSpeedKmh} km/h)`,
    accelGain:           stock.accel0to60 > 0
      ? `−${accelGain60.toFixed(2)}s 0–60 (${stock.accel0to60}s → ${predicted.accel0to60}s)`
      : 'Improved launch & mid-range pull',
    throttleImprovement: `+${throttleGain} pts throttle response score (${stock.throttleResponse} → ${predicted.throttleResponse}/100)`,
    reliabilityImpact:   reliabilityMsg,
    ridingFeel:          feelMsg,
  };
}

export async function generatePlan(input: RiderInput, history: ChatMessage[]): Promise<AgentPlan> {
  const stock = getStockPerf(input.model);
  const setup = buildSetupAnalysis(input, stock);

  const userMsg = `Rider profile:
- Motorcycle: ${input.model} (${input.year})
- Mileage: ${input.mileage} km
- Budget: PHP ${input.budgetPHP}
- Goal: ${input.goal}
- Riding style: ${input.ridingStyle}
- Existing mods: ${input.existingMods || 'none'}

Budget tier: ${detectTier(input.budgetPHP)} (${TIER_LABELS[detectTier(input.budgetPHP)]})
IMPORTANT: Recommend specific brand names appropriate to the "${detectTier(input.budgetPHP)}" budget tier.

Task: produce a complete modification roadmap with brand-specific recommendations.
${PLAN_SCHEMA_INSTRUCTION}`;

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: AGENT_SYSTEM_PROMPT },
      ...history.slice(-10),
      { role: 'user', content: userMsg },
    ];
    const raw = await callLLM(messages, true, 'agent');
    const parsed = JSON.parse(raw);
    const tier = detectTier(input.budgetPHP);
    parsed.recommendations = (parsed.recommendations || []).map((r: any) => ({
      ...r,
      brand: r.brand || '',
      tierLabel: r.tierLabel || TIER_LABELS[tier],
      priceRange: r.priceRange || { min: Math.round(r.estCostPHP * 0.85), max: Math.round(r.estCostPHP * 1.2) },
      performanceImpact: r.performanceImpact || { topSpeedDelta: 2, accelPct: 3, throttlePct: 5, label: 'Performance Upgrade' },
      compatibilityScore: r.compatibilityScore || 'High',
      synergyNote: r.synergyNote || '',
    }));
    parsed.totalPHP = parsed.recommendations?.reduce((s: number, r: Recommendation) => s + (r.estCostPHP || 0), 0) || 0;
    const totalMin = parsed.recommendations?.reduce((s: number, r: Recommendation) => s + r.priceRange.min, 0) || 0;
    const totalMax = parsed.recommendations?.reduce((s: number, r: Recommendation) => s + r.priceRange.max, 0) || 0;
    parsed.totalRange = parsed.totalRange || { min: totalMin, max: totalMax };
    const predicted = applyRecsToPerf(setup.currentPerformance, parsed.recommendations);
    return {
      ...parsed,
      setupAnalysis: setup,
      stockPerformance: stock,
      currentPerformance: setup.currentPerformance,
      predictedPerformance: predicted,
      buildOutcome: buildOutcomeSummary(stock, predicted, parsed.recommendations),
    } as AgentPlan;
  } catch (e: any) {
    if (e.message === 'NO_API_KEY') return fallbackPlan(input);
    throw e;
  }
}

function normalizeRecommendations(input: RiderInput, recommendations: any[]): Recommendation[] {
  const tier = detectTier(input.budgetPHP);
  return (recommendations || []).map((r: any, idx: number) => {
    const category = String(r.category || 'engine').toLowerCase();
    const impact = PART_IMPACT[category] ?? { topSpeedDelta: 1, accelPct: 3, throttlePct: 4, label: 'Performance Upgrade' };
    const estCost = Number(r.estCostPHP || 0);
    const safeCost = Number.isFinite(estCost) && estCost > 0 ? Math.round(estCost) : 0;
    const min = Math.max(1, Math.round((r.priceRange?.min ?? safeCost * 0.85) || 1));
    const max = Math.max(min, Math.round((r.priceRange?.max ?? safeCost * 1.2) || min));
    return {
      name: String(r.name || 'Unknown Part'),
      brand: String(r.brand || ''),
      tierLabel: (r.tierLabel || TIER_LABELS[tier]) as Recommendation['tierLabel'],
      reason: String(r.reason || 'Recommended from mechanic chat discussion.'),
      estCostPHP: safeCost || Math.round((min + max) / 2),
      priceRange: { min, max },
      category,
      priority: Number(r.priority || idx + 1),
      searchQuery: String(r.searchQuery || `${input.model} ${r.brand || ''} ${r.name || ''}`).replace(/\s+/g, ' ').trim(),
      performanceImpact: {
        topSpeedDelta: Number(r.performanceImpact?.topSpeedDelta ?? impact.topSpeedDelta),
        accelPct: Number(r.performanceImpact?.accelPct ?? impact.accelPct),
        throttlePct: Number(r.performanceImpact?.throttlePct ?? impact.throttlePct),
        label: String(r.performanceImpact?.label ?? impact.label),
      },
      compatibilityScore: (r.compatibilityScore || 'High') as Recommendation['compatibilityScore'],
      synergyNote: String(r.synergyNote || defaultSynergy(category)),
    };
  });
}

function recommendationsWithoutPricing(recommendations: Recommendation[]): Recommendation[] {
  return recommendations.map(r => ({
    ...r,
    estCostPHP: 0,
    priceRange: { min: 0, max: 0 },
  }));
}

function assemblePlanFromRecommendations(
  input: RiderInput,
  recommendations: Recommendation[],
  analysis = '',
  notes = '',
  options?: { hidePricing?: boolean },
): AgentPlan {
  const hidePricing = options?.hidePricing ?? false;
  const recs = hidePricing ? recommendationsWithoutPricing(recommendations) : recommendations;
  const stock = getStockPerf(input.model);
  const setup = buildSetupAnalysis(input, stock);
  const totalPHP = hidePricing ? 0 : recs.reduce((s, r) => s + (r.estCostPHP || 0), 0);
  const totalMin = hidePricing ? 0 : recs.reduce((s, r) => s + (r.priceRange?.min || 0), 0);
  const totalMax = hidePricing ? 0 : recs.reduce((s, r) => s + (r.priceRange?.max || 0), 0);
  const predicted = applyRecsToPerf(setup.currentPerformance, recs);
  return {
    analysis: hidePricing ? '' : (analysis || `Generated from mechanic chat recommendations for ${input.model} based on your current profile and goal.`),
    recommendations: recs,
    totalPHP,
    totalRange: { min: totalMin, max: totalMax },
    notes: notes || (hidePricing ? '' : 'Synced from chat conversation.'),
    hidePricing,
    setupAnalysis: setup,
    stockPerformance: stock,
    currentPerformance: setup.currentPerformance,
    predictedPerformance: predicted,
    buildOutcome: buildOutcomeSummary(stock, predicted, recs),
  };
}

export async function generatePlanFromChat(input: RiderInput, history: ChatMessage[]): Promise<AgentPlan | null> {
  try {
    const userMsg = `Rider profile:
- Motorcycle: ${input.model} (${input.year})
- Mileage: ${input.mileage} km
- Budget: PHP ${input.budgetPHP}
- Goal: ${input.goal}
- Riding style: ${input.ridingStyle}
- Existing mods: ${input.existingMods || 'none'}

Extract only the concrete parts/items already recommended in the chat and convert them to a complete plan.
If the chat does not contain clear item recommendations, return {"analysis":"", "recommendations":[], "totalPHP":0, "totalRange":{"min":0,"max":0}, "notes":""}
${PLAN_SCHEMA_INSTRUCTION}`;

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: CHAT_SYSTEM_PROMPT + '\nYou are now a data extractor. Return strict JSON only using the requested schema.',
      },
      ...history.slice(-20),
      { role: 'user', content: userMsg },
    ];

    const raw = await callLLM(messages, true, 'chat');
    const parsed = JSON.parse(raw);
    const recommendations = normalizeRecommendations(input, parsed.recommendations || []).map(r => ({
      ...r,
      reason: '',
    }));
    if (!recommendations.length) return null;
    return assemblePlanFromRecommendations(
      input,
      recommendations,
      '',
      '',
      { hidePricing: true },
    );
  } catch (e: any) {
    if (e.message === 'NO_API_KEY') return null;
    return null;
  }
}

function inferCategoryFromText(text: string): Recommendation['category'] {
  const t = text.toLowerCase();
  if (/roller|variator|cvt|clutch spring|torque drive/.test(t)) return 'cvt';
  if (/filter|pod|intake|airbox/.test(t)) return 'intake';
  if (/exhaust|pipe|muffler|slip-on|full-system/.test(t)) return 'exhaust';
  if (/ecu|cdi|ignition/.test(t)) return 'electrical';
  if (/shock|suspension/.test(t)) return 'suspension';
  if (/brake|pad|disc|rotor/.test(t)) return 'brakes';
  if (/tire|tyre/.test(t)) return 'tires';
  if (/seat|windshield|comfort/.test(t)) return 'comfort';
  if (/decal|mirror|led|headlight|aesthetic|visual/.test(t)) return 'aesthetics';
  return 'engine';
}

function parseRecommendationsFromAssistantReply(input: RiderInput, reply: string): Recommendation[] {
  const lines = reply
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const candidateLines = lines.filter(l => /^[-*•]\s+/.test(l) || /^\d+[\).\s-]+/.test(l));
  if (!candidateLines.length) return [];

  const tier = detectTier(input.budgetPHP);
  const recs: Recommendation[] = [];

  for (let i = 0; i < candidateLines.length; i++) {
    const raw = candidateLines[i]
      .replace(/^[-*•]\s+/, '')
      .replace(/^\d+[\).\s-]+/, '')
      .trim();
    if (!raw) continue;

    const [namePart] = raw.split(/\s[-:]\s/);
    const name = (namePart || raw).trim();
    const category = inferCategoryFromText(raw);
    const impact = PART_IMPACT[category] ?? { topSpeedDelta: 1, accelPct: 3, throttlePct: 4, label: 'Performance Upgrade' };

    recs.push({
      name: name.replace(/(?:₱|php)\s*[\d,]+(?:\s*(?:-|to|–)\s*(?:₱|php)?\s*[\d,]+)?/gi, '').trim(),
      brand: '',
      tierLabel: TIER_LABELS[tier],
      reason: '',
      estCostPHP: 0,
      priceRange: { min: 0, max: 0 },
      category,
      priority: i + 1,
      searchQuery: `${input.model} ${name}`.trim(),
      performanceImpact: impact,
      compatibilityScore: 'High',
      synergyNote: defaultSynergy(category),
    });
  }

  return recs;
}

export function planFromAssistantReply(input: RiderInput, reply: string): AgentPlan | null {
  const recommendations = parseRecommendationsFromAssistantReply(input, reply);
  if (!recommendations.length) return null;
  return assemblePlanFromRecommendations(
    input,
    recommendations,
    '',
    '',
    { hidePricing: true },
  );
}

export async function chat(history: ChatMessage[]): Promise<string> {
  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: CHAT_SYSTEM_PROMPT + '\nIMPORTANT FORMATTING RULES: Reply concisely as a mechanic. NEVER use markdown formatting, code fences, backticks, asterisks, or any special formatting. Write in plain text only. Use simple dashes for lists. Keep answers short and conversational like a real Filipino mechanic talking to a customer. Put tips and steps in the main reply; if you list parts, use a final short bullet list of names only with no prices.' },
      ...history.slice(-20),
    ];
    return await callLLM(messages, false, 'chat');
  } catch (e: any) {
    if (e.message === 'NO_API_KEY')
      return 'Offline mode: add your Gemini API key in Settings to enable chat. You can still use Run Agent or offline rule-based plans.';
    return e.message?.startsWith('Gemini') || e.message?.startsWith('Groq')
      ? e.message
      : `Error: ${e.message}`;
  }
}

/* -------- Rule-based fallback — full enhanced plan -------- */
function fallbackPlan(input: RiderInput): AgentPlan {
  const goal    = input.goal.toLowerCase();
  const model   = input.model.toLowerCase();
  const modelName = input.model;
  const isScooter = /click|aerox|nmax|adv|pcx|mio|beat|burgman/.test(model);
  const tier    = detectTier(input.budgetPHP);
  const stock   = getStockPerf(input.model);
  const setup   = buildSetupAnalysis(input, stock);
  const existingCats = setup.detectedMods.map(m => m.category);

  const recs: Recommendation[] = [];

  if (goal.includes('accel') || goal.includes('top speed') || goal.includes('speed')) {
    if (isScooter) {
      if (!existingCats.includes('cvt'))
        recs.push(pick(ROLLER_WEIGHTS, tier, modelName, 'cvt', 1,
          'Lighter rollers shift power delivery for quicker CVT engagement — noticeable throttle response improvement.',
          'High', 'Best combined with clutch springs for maximum launch'));
      if (!existingCats.includes('cvt'))
        recs.push(pick(CLUTCH_SPRINGS, tier, modelName, 'cvt', 2,
          'Stiffer springs raise engagement RPM for a stronger launch off the line.',
          'High', 'Works in synergy with roller weights'));
      if (!existingCats.includes('intake'))
        recs.push(pick(POD_FILTER, tier, modelName, 'intake', 3,
          'Open pod filter increases airflow, improving low-to-mid range power.',
          'High', 'Pair with exhaust for maximum airflow gains'));
      if (!existingCats.includes('electrical'))
        recs.push(pick(CDI_ECU, tier, modelName, 'electrical', 4,
          'Removes the factory rev limiter and optimizes ignition timing for more usable power.',
          'High', 'Multiplies gains from intake and exhaust upgrades'));
      if (!existingCats.includes('exhaust'))
        recs.push(pick(EXHAUST_SCOOTER, tier, modelName, 'exhaust', 5,
          'Reduces back-pressure, freeing top-end power. Paired with intake mod for balanced gains.',
          'High', 'Synergy with air filter for balanced airflow tuning'));
    } else {
      if (!existingCats.includes('intake'))
        recs.push(pick(HIGH_FLOW_FILTER, tier, modelName, 'intake', 1,
          'More airflow means better throttle response and slight power gains across the rev range.',
          'High', 'Pair with exhaust for maximum airflow gains'));
      if (!existingCats.includes('engine'))
        recs.push(pick(SPROCKET_SET, tier, modelName, 'engine', 2,
          'Shorter final drive gearing trades a bit of top speed for significantly stronger acceleration.',
          'High', 'Most effective acceleration mod for underbone/naked bikes'));
      if (!existingCats.includes('exhaust'))
        recs.push(pick(EXHAUST_UNDERBONE, tier, modelName, 'exhaust', 3,
          'Frees top-end power, reduces weight. Best paired with the air filter upgrade for balanced tuning.',
          'High', 'Synergy with air filter for balanced airflow tuning'));
    }
  } else if (goal.includes('fuel')) {
    if (!existingCats.includes('engine'))
      recs.push(pick(SPARK_PLUG, tier, modelName, 'engine', 1,
        'Iridium/laser iridium tip provides cleaner combustion and slight fuel economy gains.',
        'High', 'Foundation upgrade before any other mods'));
    recs.push(pick(TIRES_ECO, tier, modelName, 'tires', 2,
      'Eco-focused tire compound with lower rolling resistance improves fuel efficiency.',
      'High', 'Essential for fuel economy builds'));
    recs.push(pick(ENGINE_OIL, tier, modelName, 'engine', 3,
      'Higher-quality oil reduces internal friction for smoother engine operation and better mileage.',
      'High', 'Always pair with fresh spark plug'));
  } else if (goal.includes('comfort') || goal.includes('long')) {
    recs.push(pick(SEAT_COVER, tier, modelName, 'comfort', 1,
      'Gel seat reduces rider fatigue and numbness on long rides — one of the best comfort upgrades.',
      'High', 'Must-have for touring builds'));
    if (!existingCats.includes('suspension'))
      recs.push(pick(REAR_SHOCK, tier, modelName, 'suspension', 2,
        'Adjustable preload and better damping dramatically improve bump absorption and ride quality.',
        'High', 'Improves high-speed stability alongside comfort'));
    recs.push(pick(WINDSHIELD, tier, modelName, 'comfort', 3,
      'Reduces wind buffeting and fatigue at highway speeds — essential for long-distance touring.',
      'High', 'Great synergy with seat upgrade for full touring setup'));
  } else if (goal.includes('aesthet')) {
    recs.push(pick(LED_HEADLIGHT, tier, modelName, 'aesthetics', 1,
      'Modern white LED output improves both nighttime visibility and overall visual appeal.',
      'High', 'Stand-alone visual upgrade'));
    recs.push(pick(BAR_END_MIRRORS, tier, modelName, 'aesthetics', 2,
      'Sleek bar-end mirrors give a premium streetfighter look while maintaining good rear visibility.',
      'High', 'Pairs well with LED headlight for cohesive build'));
    recs.push(pick(DECAL_KIT, tier, modelName, 'aesthetics', 3,
      "Custom decals are the most cost-effective way to personalize your bike's appearance.",
      'High', 'Low-cost visual upgrade with high visual impact'));
  } else if (goal.includes('commut') || goal.includes('daily')) {
    if (!existingCats.includes('brakes'))
      recs.push(pick(BRAKE_PADS, tier, modelName, 'brakes', 1,
        'Better braking confidence is the #1 safety upgrade for daily city riding in traffic.',
        'High', 'Critical safety upgrade for all builds'));
    if (!existingCats.includes('engine'))
      recs.push(pick(SPARK_PLUG, tier, modelName, 'engine', 2,
        'Cleaner combustion improves fuel efficiency and engine response for stop-and-go commuting.',
        'High', 'Foundation maintenance upgrade'));
    recs.push(pick(ENGINE_OIL, tier, modelName, 'engine', 3,
      'Quality oil protects the engine during frequent short trips and city heat.',
      'High', 'Reduces engine wear during stop-and-go riding'));
    recs.push(pick(TIRES_PERF, tier, modelName, 'tires', 4,
      'Better grip in wet and dry conditions — critical for daily commuting safety.',
      'High', 'Foundation of all safety and performance'));
  } else {
    // Generic / fallback
    if (!existingCats.includes('brakes'))
      recs.push(pick(BRAKE_PADS, tier, modelName, 'brakes', 1,
        'Stronger, safer braking is the best starting point for any modification plan.',
        'High', 'Critical safety upgrade for all builds'));
    recs.push(pick(ENGINE_OIL, tier, modelName, 'engine', 2,
      'A quality oil change is baseline health maintenance — do this before any performance mod.',
      'High', 'Foundation for all engine performance gains'));
    if (!existingCats.includes('engine'))
      recs.push(pick(SPARK_PLUG, tier, modelName, 'engine', 3,
        'Fresh iridium plug ensures clean combustion and smooth idle.',
        'High', 'Works synergistically with quality oil'));
  }

  // Budget trim
  const budget = input.budgetPHP || 999999;
  let running = 0;
  const trimmed = recs.filter(r => {
    if (running + r.estCostPHP <= budget) { running += r.estCostPHP; return true; }
    return false;
  });

  const totalMin = trimmed.reduce((s, r) => s + r.priceRange.min, 0);
  const totalMax = trimmed.reduce((s, r) => s + r.priceRange.max, 0);
  const predicted = applyRecsToPerf(setup.currentPerformance, trimmed);
  const outcome   = buildOutcomeSummary(stock, predicted, trimmed);

  return {
    analysis: `Goal "${input.goal}" on a ${input.model} (${input.year}, ${input.mileage} km). Budget PHP ${budget.toLocaleString()} (${TIER_LABELS[tier]} tier). Selected ${trimmed.length} brand-specific upgrades within your price range — ${tier === 'budget' ? 'economy brands for maximum value' : tier === 'mid' ? 'proven aftermarket brands balancing quality and cost' : 'premium top-tier brands for the best performance and durability'}.${setup.detectedMods.length > 0 ? ` Detected ${setup.detectedMods.length} existing mod(s) — duplicates excluded from recommendations.` : ''}`,
    recommendations: trimmed,
    totalPHP: running,
    totalRange: { min: totalMin, max: totalMax },
    notes: `Offline rule-based plan (${TIER_LABELS[tier]} tier). Brands selected to match your PHP ${budget.toLocaleString()} budget. Add an OpenAI key in Settings for deeper, model-specific reasoning.`,
    setupAnalysis: setup,
    stockPerformance: stock,
    currentPerformance: setup.currentPerformance,
    predictedPerformance: predicted,
    buildOutcome: outcome,
  };
}

/* -------- Marketplace link generation -------- */
export function marketplaceLinks(query: string) {
  const q = encodeURIComponent(query);
  return {
    shopee: `https://shopee.ph/search?keyword=${q}`,
    lazada: `https://www.lazada.com.ph/catalog/?q=${q}`,
    tiktok: `https://www.tiktok.com/shop/s/${q}`,
  };
}
