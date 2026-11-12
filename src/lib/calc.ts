import { NUTRIENT_MAP, getUl, type AgeGroup, type Sex } from "@/data/nutrients";

export type Ingredient = { nutrientId: string; amount: number; unit: string };
export type Supplement = { id: string; name: string; ingredients: Ingredient[] };
export type Profile = { sex: Sex; age: AgeGroup };

/** 상한에 가깝다고 보는 비율. 기획 제안값이며 출시 전에 확정한다. */
export const NEAR_RATIO = 0.8;

export type Status = "over" | "near" | "ok" | "none";

export type ResultRow = {
  nutrientId: string;
  name: string;
  baseUnit: string;
  total: number;
  ul?: number;
  ratio?: number;
  status: Status;
  /** 이 성분이 들어 있는 제품 이름들 */
  sources: string[];
  ulNote?: string;
};

export function toBase(nutrientId: string, amount: number, unit: string): number {
  const n = NUTRIENT_MAP[nutrientId];
  const u = n?.units.find((x) => x.label === unit) ?? n?.units[0];
  return amount * (u?.toBase ?? 1);
}

export function calculate(supplements: Supplement[], profile: Profile): ResultRow[] {
  const acc = new Map<string, { total: number; sources: Set<string> }>();

  supplements.forEach((s, i) => {
    const label = s.name.trim() || `영양제 ${i + 1}`;
    s.ingredients.forEach((ing) => {
      if (!NUTRIENT_MAP[ing.nutrientId] || !(ing.amount > 0)) return;
      const cur = acc.get(ing.nutrientId) ?? { total: 0, sources: new Set<string>() };
      cur.total += toBase(ing.nutrientId, ing.amount, ing.unit);
      cur.sources.add(label);
      acc.set(ing.nutrientId, cur);
    });
  });

  const rows: ResultRow[] = [];
  acc.forEach((v, id) => {
    const n = NUTRIENT_MAP[id];
    const ul = getUl(n, profile.sex, profile.age);
    const ratio = ul ? v.total / ul : undefined;
    let status: Status = "none";
    if (ratio !== undefined) status = ratio > 1 ? "over" : ratio >= NEAR_RATIO ? "near" : "ok";
    rows.push({
      nutrientId: id,
      name: n.name,
      baseUnit: n.baseUnit,
      total: round(v.total),
      ul,
      ratio,
      status,
      sources: [...v.sources],
      ulNote: n.ulNote,
    });
  });

  const order: Record<Status, number> = { over: 0, near: 1, ok: 2, none: 3 };
  return rows.sort((a, b) => order[a.status] - order[b.status] || (b.ratio ?? 0) - (a.ratio ?? 0));
}

function round(x: number) {
  return Math.round(x * 100) / 100;
}
