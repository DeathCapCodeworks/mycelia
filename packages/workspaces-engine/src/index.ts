export type LayoutSpec = { widgets: Array<{ id: string; x: number; y: number; w: number; h: number }> };
export type SignalExpr = { type: 'time' | 'geo' | 'network' | 'process'; match: unknown; priority?: number };
export type Action = { type: 'activate'; name: string };

type Rule = { when: SignalExpr; then: Action[] };

const layouts = new Map<string, LayoutSpec>();
const rules: Rule[] = [];
let active = '';

export function define(name: string, layout: LayoutSpec) { layouts.set(name, layout); }
export function rule(when: SignalExpr, then: Action[]) { rules.push({ when, then }); }
export function activate(name: string) { if (layouts.has(name)) active = name; }
export function current() { return active; }

type Handler = (payload: unknown) => void;
const subscribers: Record<'time'|'process'|'geo'|'network', Handler[]> = {
  time: [], process: [], geo: [], network: []
};
export const signals = {
  subscribe(source: 'time'|'process'|'geo'|'network', handler: Handler) {
    subscribers[source].push(handler);
  }
};

function evaluateRule(expr: SignalExpr, payload: any): boolean {
  switch (expr.type) {
    case 'time': {
      const [start, end] = expr.match as [string, string];
      const now = payload as string; // 'HH:MM'
      return now >= start && now <= end;
    }
    case 'network': {
      const ssid = expr.match as string;
      return payload === ssid;
    }
    case 'process': {
      const name = expr.match as string;
      return payload === name;
    }
    case 'geo': {
      const [lat, lon, r] = expr.match as [number, number, number];
      const [plat, plon] = payload as [number, number];
      const d = Math.hypot(plat - lat, plon - lon);
      return d <= r;
    }
  }
}

export function dispatch(source: 'time'|'process'|'geo'|'network', payload: unknown) {
  for (const h of subscribers[source]) h(payload);
  const candidates = rules
    .filter((r) => r.when.type === source && evaluateRule(r.when, payload))
    .sort((a, b) => (b.when.priority ?? 0) - (a.when.priority ?? 0));
  if (candidates.length) {
    const chosen = candidates[0];
    for (const a of chosen.then) if (a.type === 'activate') activate(a.name);
  }
}

export function evaluate(payload: any): string {
  const candidates = rules
    .filter((r) => evaluateRule(r.when, payload))
    .sort((a, b) => (b.when.priority ?? 0) - (a.when.priority ?? 0));
  if (candidates.length) {
    const chosen = candidates[0];
    for (const a of chosen.then) if (a.type === 'activate') return a.name;
  }
  return active;
}

export function serialize() {
  return JSON.stringify({ layouts: Array.from(layouts.entries()), rules, active });
}
export function load(json: string) {
  const obj = JSON.parse(json) as { layouts: [string, LayoutSpec][], rules: Rule[], active: string };
  layouts.clear();
  for (const [k, v] of obj.layouts) layouts.set(k, v);
  rules.splice(0, rules.length, ...obj.rules);
  active = obj.active;
}

