import { NUTRIENT_MAP, getUl, type AgeGroup, type Sex } from "@/data/nutrients";

/** unknown: 용량을 몰라서 성분만 넣은 경우. 겹침에는 세고 합계에는 넣지 않는다. */
export type Ingredient = { nutrientId: string; amount: number; unit: string; unknown?: boolean };
export type Supplement = { id: string; name: string; ingredients: Ingredient[] };
export type Profile = { sex: Sex; age: AgeGroup };

/** 상한에 가깝다고 보는 비율. 기획 제안값이며 출시 전에 확정한다. */
export const NEAR_RATIO = 0.8;

export type Status = "over" | "near" | "ok" | "none" | "unknown";

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
  /** 용량을 모른다고 표시한 제품들. 이 성분의 실제 합계는 total보다 많을 수 있다 */
  unknownSources: string[];
  ulNote?: string;
};

export function toBase(nutrientId: string, amount: number, unit: string): number {
  const n = NUTRIENT_MAP[nutrientId];
  const u = n?.units.find((x) => x.label === unit) ?? n?.units[0];
  return amount * (u?.toBase ?? 1);
}

export function calculate(supplements: Supplement[], profile: Profile): ResultRow[] {
  const acc = new Map<string, { total: number; sources: Set<string>; unknown: Set<string> }>();

  supplements.forEach((s, i) => {
    const label = s.name.trim() || `영양제 ${i + 1}`;
    s.ingredients.forEach((ing) => {
      if (!isFilled(ing)) return;
      const cur = acc.get(ing.nutrientId) ?? { total: 0, sources: new Set<string>(), unknown: new Set<string>() };
      if (ing.unknown) cur.unknown.add(label);
      else cur.total += toBase(ing.nutrientId, ing.amount, ing.unit);
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
    // 용량 모르는 제품이 있으면 "안쪽"이라고 단정하지 않는다. 넘음·근접은 아는 양만으로도 성립하므로 그대로 둔다.
    if (v.unknown.size > 0 && (status === "ok" || (status === "none" && v.total === 0))) status = "unknown";
    rows.push({
      nutrientId: id,
      name: n.name,
      baseUnit: n.baseUnit,
      total: round(v.total),
      ul,
      ratio,
      status,
      sources: [...v.sources],
      unknownSources: [...v.unknown],
      ulNote: n.ulNote,
    });
  });

  const order: Record<Status, number> = { over: 0, near: 1, unknown: 2, ok: 3, none: 4 };
  return rows.sort((a, b) => order[a.status] - order[b.status] || (b.ratio ?? 0) - (a.ratio ?? 0));
}

/** 성분이 골라져 있고, 함량을 넣었거나 "용량 모름"으로 표시했으면 입력된 것으로 본다 */
export function isFilled(ing: Ingredient) {
  return !!NUTRIENT_MAP[ing.nutrientId] && (ing.unknown === true || ing.amount > 0);
}

function round(x: number) {
  return Math.round(x * 100) / 100;
}
