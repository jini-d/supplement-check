/**
 * 성분별 단위와 상한섭취량(UL)
 *
 * 출처: 보건복지부·한국영양학회, 「2025 한국인 영양소 섭취기준」(2025.12.31 발표) 성인 19~64세.
 * - 요약 활용본(서울의료원 게시본)의 표를 옮겼고, 비타민 B6는 2025 개정 보도(100 → 50mg)를 따랐다.
 * - verified: false 인 항목은 출시 전에 원문 표와 한 번 더 대조해야 한다.
 * - UL이 정해지지 않은 성분은 ul을 비워 두고, 합계만 보여 준다(판정하지 않음).
 */

export type Sex = "male" | "female";
export type AgeGroup = "19-29" | "30-49" | "50-64";

export type UnitDef = {
  /** 화면에 보이는 단위 */
  label: string;
  /** 기준 단위로 바꿀 때 곱하는 수 */
  toBase: number;
};

export type Nutrient = {
  id: string;
  name: string;
  /** 판정에 쓰는 기준 단위 */
  baseUnit: string;
  /** 입력할 때 고를 수 있는 단위(첫 번째가 기본) */
  units: UnitDef[];
  /** 상한섭취량. 성별·연령에 따라 다르면 함수로 */
  ul?: number | ((sex: Sex, age: AgeGroup) => number);
  /** 상한섭취량에 붙는 설명 */
  ulNote?: string;
  verified: boolean;
};

const mgUg: UnitDef[] = [
  { label: "mg", toBase: 1 },
  { label: "µg", toBase: 0.001 },
];
const ugMg: UnitDef[] = [
  { label: "µg", toBase: 1 },
  { label: "mg", toBase: 1000 },
];

export const NUTRIENTS: Nutrient[] = [
  { id: "vitA", name: "비타민 A", baseUnit: "µg RAE", units: [{ label: "µg RAE", toBase: 1 }], ul: 3000, ulNote: "레티놀 기준", verified: true },
  {
    id: "vitD",
    name: "비타민 D",
    baseUnit: "µg",
    units: [
      { label: "µg", toBase: 1 },
      { label: "IU", toBase: 1 / 40 },
    ],
    ul: 100,
    verified: true,
  },
  { id: "vitE", name: "비타민 E", baseUnit: "mg α-TE", units: [{ label: "mg α-TE", toBase: 1 }], ul: 540, verified: false },
  { id: "vitC", name: "비타민 C", baseUnit: "mg", units: mgUg, ul: 2000, verified: true },
  { id: "vitB1", name: "비타민 B1", baseUnit: "mg", units: mgUg, verified: true },
  { id: "vitB2", name: "비타민 B2", baseUnit: "mg", units: mgUg, verified: true },
  { id: "niacinAcid", name: "나이아신 (니코틴산)", baseUnit: "mg", units: mgUg, ul: 35, ulNote: "니코틴산 형태 기준", verified: true },
  { id: "niacinAmide", name: "나이아신 (니코틴아마이드)", baseUnit: "mg", units: mgUg, ul: 850, ulNote: "니코틴아마이드 형태 기준", verified: true },
  { id: "vitB6", name: "비타민 B6", baseUnit: "mg", units: mgUg, ul: 50, ulNote: "2025 개정으로 100mg에서 낮아짐", verified: false },
  { id: "folate", name: "엽산", baseUnit: "µg", units: ugMg, ul: 1000, ulNote: "보충제·강화식품으로 먹는 양 기준", verified: true },
  { id: "vitB12", name: "비타민 B12", baseUnit: "µg", units: ugMg, verified: true },
  { id: "biotin", name: "비오틴", baseUnit: "µg", units: ugMg, verified: true },
  { id: "pantothenic", name: "판토텐산", baseUnit: "mg", units: mgUg, verified: true },
  {
    id: "calcium",
    name: "칼슘",
    baseUnit: "mg",
    units: mgUg,
    ul: (sex, age) => {
      if (sex === "male") return age === "19-29" ? 3000 : 2500;
      return age === "19-29" ? 2500 : 2000;
    },
    ulNote: "성별·연령에 따라 다름",
    verified: false,
  },
  { id: "magnesium", name: "마그네슘", baseUnit: "mg", units: mgUg, ul: 350, ulNote: "식품 외 급원(영양제 등)만 기준", verified: false },
  { id: "iron", name: "철", baseUnit: "mg", units: mgUg, ul: 45, verified: true },
  { id: "zinc", name: "아연", baseUnit: "mg", units: mgUg, ul: 35, verified: true },
  { id: "copper", name: "구리", baseUnit: "µg", units: ugMg, ul: 10000, verified: true },
  { id: "manganese", name: "망간", baseUnit: "mg", units: mgUg, ul: 11, verified: true },
  { id: "iodine", name: "요오드", baseUnit: "µg", units: ugMg, ul: 2400, verified: true },
  { id: "selenium", name: "셀레늄", baseUnit: "µg", units: ugMg, ul: 400, verified: true },
];

export const NUTRIENT_MAP = Object.fromEntries(NUTRIENTS.map((n) => [n.id, n])) as Record<string, Nutrient>;

export function getUl(n: Nutrient, sex: Sex, age: AgeGroup): number | undefined {
  if (n.ul === undefined) return undefined;
  return typeof n.ul === "function" ? n.ul(sex, age) : n.ul;
}

export const SOURCE_LABEL = "보건복지부·한국영양학회, 2025 한국인 영양소 섭취기준 (성인 19~64세)";

/**
 * 라벨을 바로 못 볼 때 고를 수 있는 "흔히 보이는 함량".
 * 특정 제품 값이 아니라 시중 제품에서 자주 보이는 함량대를 고른 참고값이다.
 */
export type TypicalDose = { amount: number; unit: string; hint: string };

export const TYPICAL: Record<string, TypicalDose[]> = {
  vitD: [
    { amount: 400, unit: "IU", hint: "종합비타민" },
    { amount: 1000, unit: "IU", hint: "단일제" },
    { amount: 2000, unit: "IU", hint: "고함량" },
  ],
  vitC: [
    { amount: 100, unit: "mg", hint: "종합비타민" },
    { amount: 1000, unit: "mg", hint: "단일제" },
  ],
  vitE: [{ amount: 11, unit: "mg α-TE", hint: "종합비타민" }],
  vitB6: [
    { amount: 1.5, unit: "mg", hint: "종합비타민" },
    { amount: 50, unit: "mg", hint: "고함량 B군" },
  ],
  folate: [{ amount: 400, unit: "µg", hint: "종합·임신 준비" }],
  vitB12: [
    { amount: 2.4, unit: "µg", hint: "종합비타민" },
    { amount: 500, unit: "µg", hint: "고함량 B군" },
  ],
  biotin: [
    { amount: 30, unit: "µg", hint: "종합비타민" },
    { amount: 5000, unit: "µg", hint: "모발용 고함량" },
  ],
  calcium: [
    { amount: 210, unit: "mg", hint: "종합비타민" },
    { amount: 500, unit: "mg", hint: "칼슘제" },
  ],
  magnesium: [
    { amount: 100, unit: "mg", hint: "종합·칼슘 복합" },
    { amount: 350, unit: "mg", hint: "마그네슘 단일제" },
  ],
  iron: [
    { amount: 12, unit: "mg", hint: "종합비타민" },
    { amount: 30, unit: "mg", hint: "철분제" },
  ],
  zinc: [
    { amount: 8.5, unit: "mg", hint: "종합비타민" },
    { amount: 30, unit: "mg", hint: "아연 단일제" },
  ],
  selenium: [
    { amount: 55, unit: "µg", hint: "종합비타민" },
    { amount: 200, unit: "µg", hint: "셀레늄 단일제" },
  ],
};
