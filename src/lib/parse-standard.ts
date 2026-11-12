import { NUTRIENT_MAP } from "@/data/nutrients";
import type { Ingredient } from "@/lib/calc";

/**
 * 식약처 건강기능식품 품목제조 신고(I0030)의 "기준 및 규격"(STDR_STND) 글에서
 * 성분별 표시량을 뽑는다.
 *
 * 예) "2. 비타민D : 표시량(10㎍/2정)의 80~180%"
 *     → { nutrientId: "vitD", amount: 10, unit: "µg", per: "2정" }
 *
 * 글 형식이 제품마다 조금씩 달라서, 못 뽑은 성분은 이름만 따로 돌려준다.
 */

/** 성분 id와 기준·규격 글에 나오는 이름 패턴 */
const NAME_PATTERNS: [string, RegExp][] = [
  ["vitA", /비타민\s*A/],
  ["vitD", /비타민\s*D(?!\d)/],
  ["vitE", /비타민\s*E/],
  ["vitC", /비타민\s*C/],
  ["vitB12", /비타민\s*B\s*12|코발라민/],
  ["vitB1", /비타민\s*B\s*1(?!\d)|티아민/],
  ["vitB2", /비타민\s*B\s*2|리보플라빈/],
  ["vitB6", /비타민\s*B\s*6/],
  ["folate", /엽산/],
  ["biotin", /비오틴/],
  ["pantothenic", /판토텐산/],
  ["calcium", /칼슘/],
  ["magnesium", /마그네슘/],
  ["iron", /^철(분)?$/],
  ["zinc", /아연/],
  ["copper", /구리/],
  ["manganese", /망간/],
  ["iodine", /요오드/],
  ["selenium", /셀레늄|셀렌/],
];

// "성분명 : 표시량(숫자 단위/섭취 단위)" 한 덩어리
const ITEM = /([^\n:：,;]{1,30}?)\s*[:：]\s*표시량\s*\(\s*([\d.,]+)\s*([^\d/)\s][^/)]*?)\s*\/\s*([^)]*)\)/g;

export type ParsedIngredient = Ingredient & { per: string };

export type ParseResult = {
  ingredients: ParsedIngredient[];
  /** 표시량은 있는데 이 서비스 성분 목록에 없거나(나이아신 등) 단위를 못 맞춘 이름 */
  skipped: string[];
};

export function normalizeUnit(raw: string): string {
  const u = raw.replace(/\s+/g, "").replace(/㎎/g, "mg").replace(/㎍|μg|ug|mcg/gi, "µg");
  if (/^IU$/i.test(u)) return "IU";
  if (/^mgα-?TE$/i.test(u)) return "mg α-TE";
  if (/^µgRA?E$/i.test(u)) return "µg RAE";
  if (/^mg/i.test(u)) return "mg";
  if (/^µg/i.test(u)) return "µg";
  return u;
}

/** 이 성분의 입력 단위 중 맞는 것을 고른다. 없으면 undefined */
function matchUnit(nutrientId: string, unit: string): string | undefined {
  const n = NUTRIENT_MAP[nutrientId];
  if (!n) return undefined;
  const exact = n.units.find((u) => u.label === unit);
  if (exact) return exact.label;
  // "µg"로만 적힌 비타민 A, "mg"로만 적힌 비타민 E처럼 접두 단위가 같으면 그 단위로 본다
  const prefix = n.units.find((u) => u.label.split(" ")[0] === unit.split(" ")[0]);
  return prefix?.label;
}

export function parseStandard(text: string | null | undefined): ParseResult {
  const ingredients: ParsedIngredient[] = [];
  const skipped: string[] = [];
  if (!text) return { ingredients, skipped };

  for (const m of text.matchAll(ITEM)) {
    // "2. 비타민D", "(2) 비타민D", "- 비타민D" 같은 번호·기호를 떼고 성분 이름만 남긴다
    const rawName = m[1].replace(/^.*?(?:\d+\s*[.)]|[-•·])\s*/, "").trim();
    const amount = Number(m[2].replace(/,/g, ""));
    const unit = normalizeUnit(m[3]);
    const per = m[4].trim();
    const hit = NAME_PATTERNS.find(([, re]) => re.test(rawName));
    const unitLabel = hit ? matchUnit(hit[0], unit) : undefined;
    if (!hit || !unitLabel || !(amount > 0)) {
      if (rawName && !skipped.includes(rawName)) skipped.push(rawName);
      continue;
    }
    if (ingredients.some((x) => x.nutrientId === hit[0])) continue;
    ingredients.push({ nutrientId: hit[0], amount, unit: unitLabel, per });
  }
  return { ingredients, skipped };
}
