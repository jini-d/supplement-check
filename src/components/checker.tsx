"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Copy,
  Info,
  Layers,
  Pill,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { NUTRIENTS, NUTRIENT_MAP, SOURCE_LABEL, TYPICAL, type AgeGroup, type Sex } from "@/data/nutrients";
import { calculate, isFilled, NEAR_RATIO, type Ingredient, type Profile, type ResultRow, type Supplement } from "@/lib/calc";
import { decodeState, encodeState } from "@/lib/share";
import { cn } from "@/lib/utils";

const uid = () => Math.random().toString(36).slice(2, 9);
const emptyIngredient = (): Ingredient => ({ nutrientId: "", amount: 0, unit: "" });
const emptySupplement = (): Supplement => ({ id: uid(), name: "", ingredients: [emptyIngredient()] });

// 영양제 카드마다 다른 색 캡슐 아이콘
const CAPSULE = ["bg-[#e3efe9] text-[#0f5c4d]", "bg-[#f3ead8] text-[#9a6b23]", "bg-[#e6ebf0] text-[#3d5566]", "bg-[#ece7ef] text-[#5d4a6b]", "bg-[#f2e6e3] text-[#8a4b3f]"];

const EXAMPLE: Supplement[] = [
  {
    id: "ex1",
    name: "예시) 종합비타민",
    ingredients: [
      { nutrientId: "vitD", amount: 25, unit: "µg" },
      { nutrientId: "zinc", amount: 8.5, unit: "mg" },
      { nutrientId: "vitB6", amount: 2, unit: "mg" },
      { nutrientId: "magnesium", amount: 100, unit: "mg" },
    ],
  },
  { id: "ex2", name: "예시) 비타민D", ingredients: [{ nutrientId: "vitD", amount: 2000, unit: "IU" }] },
  {
    id: "ex3",
    name: "예시) 아연·마그네슘",
    ingredients: [
      { nutrientId: "zinc", amount: 30, unit: "mg" },
      { nutrientId: "magnesium", amount: 250, unit: "mg" },
    ],
  },
  {
    id: "ex4",
    name: "예시) 비타민B 컴플렉스",
    ingredients: [
      { nutrientId: "vitB6", amount: 0, unit: "mg", unknown: true },
      { nutrientId: "vitB12", amount: 500, unit: "µg" },
    ],
  },
];

export function Checker() {
  const [profile, setProfile] = useState<Profile>({ sex: "female", age: "30-49" });
  const [supplements, setSupplements] = useState<Supplement[]>([emptySupplement()]);
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // 공유 링크로 들어오면 입력 내용을 복원하고 결과를 바로 보여 준다
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const restored = decodeState(hash);
    if (restored) {
      setProfile(restored.profile);
      setSupplements(restored.supplements);
      setShown(true);
      track("shared_link_opened");
    }
  }, []);

  const results = useMemo(() => calculate(supplements, profile), [supplements, profile]);
  const filledCount = supplements.filter((s) => s.ingredients.some(isFilled)).length;

  const updateSupplement = (id: string, patch: Partial<Supplement>) =>
    setSupplements((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const updateIngredient = (sid: string, idx: number, patch: Partial<Ingredient>) =>
    setSupplements((list) =>
      list.map((s) =>
        s.id === sid ? { ...s, ingredients: s.ingredients.map((ing, i) => (i === idx ? { ...ing, ...patch } : ing)) } : s,
      ),
    );

  const showResult = () => {
    setShown(true);
    track("result_viewed", { supplements: filledCount, nutrients: results.length });
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${encodeState(profile, supplements)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("아래 링크를 복사하세요", url);
    }
    track("share_clicked");
  };

  return (
    <div className="bg-blob min-h-dvh">
      <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-10 sm:pt-16">
        {/* 히어로 */}
        <header className="mb-10">
          <span className="glass inline-flex items-center gap-1.5 rounded-full border border-white/70 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
            <ShieldCheck className="size-3.5" aria-hidden /> 2025 한국인 영양소 섭취기준 반영
          </span>
          <h1 className="mt-5 text-[28px] font-bold leading-[1.25] tracking-tight sm:text-[40px]">
            같이 먹는 영양제,
            <br />
            <span className="text-primary">
              겹치거나 <span className="bg-[linear-gradient(transparent_62%,rgba(212,175,106,0.35)_62%)]">너무 많지</span> 않을까?
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            라벨의 성분과 함량을 넣으면 성분별 합계, 여러 제품에 겹치는 성분, 하루 상한섭취량 대비 비율을 한 번에 보여 드려요.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-foreground/80">
            {["로그인 없이 1분", "IU·µg·mg 자동 환산", "결과 링크로 공유"].map((t) => (
              <li key={t} className="glass rounded-full border border-white/70 px-3 py-1.5 shadow-sm">
                {t}
              </li>
            ))}
          </ul>
          <HeroVisual />
        </header>

        {/* 1. 기본 정보 */}
        <Section step={1} title="기본 정보" desc="칼슘처럼 성별·나이에 따라 상한섭취량이 다른 성분이 있어요.">
          <div className="grid grid-cols-2 gap-3">
            <Segmented
              label="성별"
              value={profile.sex}
              options={[
                { value: "female", label: "여성" },
                { value: "male", label: "남성" },
              ]}
              onChange={(v) => setProfile({ ...profile, sex: v as Sex })}
            />
            <label className="text-sm">
              <span className="mb-1.5 block font-medium text-muted-foreground">나이</span>
              <NativeSelect
                className="h-11 rounded-xl bg-white"
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: e.target.value as AgeGroup })}
              >
                <option value="19-29">19~29세</option>
                <option value="30-49">30~49세</option>
                <option value="50-64">50~64세</option>
              </NativeSelect>
            </label>
          </div>
        </Section>

        {/* 2. 영양제 입력 */}
        <Section
          step={2}
          title="먹고 있는 영양제"
          desc="라벨의 ‘1일 섭취량 기준’ 함량을 넣어 주세요. 함량을 모르면 성분만 넣어도 겹치는지는 볼 수 있어요."
          action={
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-primary"
              onClick={() => {
                setSupplements(EXAMPLE.map((s) => ({ ...s, id: uid() })));
                track("example_loaded");
              }}
            >
              <Sparkles /> 예시로 채우기
            </Button>
          }
        >
          <div className="space-y-3">
            {supplements.map((s, sIdx) => (
              <div key={s.id} className="rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(20,32,29,0.04)] sm:p-5">
                <div className="flex items-center gap-3">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", CAPSULE[sIdx % CAPSULE.length])}>
                    <Pill className="size-5" aria-hidden />
                  </span>
                  <Input
                    aria-label={`영양제 ${sIdx + 1} 이름`}
                    placeholder={`영양제 ${sIdx + 1} 이름 (예: 종합비타민)`}
                    value={s.name}
                    onChange={(e) => updateSupplement(s.id, { name: e.target.value })}
                    className="h-11 rounded-xl border-transparent bg-muted/60 font-semibold focus-visible:bg-white"
                  />
                  {supplements.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 rounded-full text-muted-foreground"
                      aria-label={`영양제 ${sIdx + 1} 삭제`}
                      onClick={() => setSupplements((list) => list.filter((x) => x.id !== s.id))}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {s.ingredients.map((ing, iIdx) => {
                    const n = NUTRIENT_MAP[ing.nutrientId];
                    const typical = TYPICAL[ing.nutrientId] ?? [];
                    return (
                      <div key={iIdx} className="rounded-xl bg-muted/40 p-2 sm:bg-transparent sm:p-0">
                      <div className="grid grid-cols-[1fr_1fr_36px] gap-2 sm:grid-cols-[1fr_120px_110px_36px]">
                        <NativeSelect
                          className="col-span-3 h-11 rounded-xl bg-white sm:col-span-1"
                          aria-label="성분"
                          value={ing.nutrientId}
                          onChange={(e) => {
                            const next = NUTRIENT_MAP[e.target.value];
                            updateIngredient(s.id, iIdx, { nutrientId: e.target.value, unit: next?.units[0].label ?? "" });
                          }}
                        >
                          <option value="">성분 선택</option>
                          {NUTRIENTS.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </NativeSelect>
                        <Input
                          className="h-11 rounded-xl bg-white"
                          aria-label="함량"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          placeholder={ing.unknown ? "모름" : "함량"}
                          disabled={ing.unknown}
                          value={ing.unknown ? "" : ing.amount || ""}
                          onChange={(e) => updateIngredient(s.id, iIdx, { amount: Number(e.target.value) })}
                        />
                        <NativeSelect
                          className="h-11 rounded-xl bg-white"
                          aria-label="단위"
                          value={ing.unit}
                          disabled={!n || ing.unknown}
                          onChange={(e) => updateIngredient(s.id, iIdx, { unit: e.target.value })}
                        >
                          {n ? n.units.map((u) => <option key={u.label}>{u.label}</option>) : <option value="">단위</option>}
                        </NativeSelect>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 rounded-full text-muted-foreground"
                          aria-label="성분 삭제"
                          disabled={s.ingredients.length === 1}
                          onClick={() => updateSupplement(s.id, { ingredients: s.ingredients.filter((_, i) => i !== iIdx) })}
                        >
                          <X />
                        </Button>
                      </div>
                      {n && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 pb-1 text-xs sm:pl-1">
                          <label className="mr-1 inline-flex cursor-pointer items-center gap-1.5 font-medium text-muted-foreground">
                            <input
                              type="checkbox"
                              className="size-4 accent-[#0f5c4d]"
                              checked={!!ing.unknown}
                              onChange={(e) => {
                                updateIngredient(s.id, iIdx, { unknown: e.target.checked });
                                if (e.target.checked) track("amount_unknown_checked", { nutrient: ing.nutrientId });
                              }}
                            />
                            용량 모름
                          </label>
                          {typical.length > 0 && (
                            <>
                              <span className="text-muted-foreground/70">흔한 함량</span>
                              {typical.map((t) => (
                                <button
                                  key={t.amount + t.unit}
                                  type="button"
                                  className={cn(
                                    "rounded-full border bg-white px-2.5 py-1 font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary",
                                    !ing.unknown && ing.amount === t.amount && ing.unit === t.unit && "border-primary/50 bg-secondary text-primary",
                                  )}
                                  onClick={() => {
                                    updateIngredient(s.id, iIdx, { amount: t.amount, unit: t.unit, unknown: false });
                                    track("typical_dose_used", { nutrient: ing.nutrientId });
                                  }}
                                >
                                  {fmt(t.amount)}
                                  {t.unit} <span className="text-muted-foreground">· {t.hint}</span>
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full px-1 text-sm font-semibold text-primary hover:underline"
                  onClick={() => updateSupplement(s.id, { ingredients: [...s.ingredients, emptyIngredient()] })}
                >
                  <Plus className="size-4" aria-hidden /> 성분 추가
                </button>
              </div>
            ))}

            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/25 py-4 text-sm font-semibold text-primary transition-colors hover:border-primary/50 hover:bg-white/60"
              onClick={() => {
                setSupplements((list) => [...list, emptySupplement()]);
                track("supplement_added", { count: supplements.length + 1 });
              }}
            >
              <Plus className="size-4" aria-hidden /> 영양제 추가
            </button>
          </div>
        </Section>

        {/* 결과 */}
        {shown && (
          <section ref={resultRef} className="mt-14 scroll-mt-6" aria-labelledby="result-title">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <span className="text-xs font-semibold tracking-wider text-primary">RESULT</span>
                <h2 id="result-title" className="mt-1 text-2xl font-bold tracking-tight">
                  내 영양제 조합 결과
                </h2>
              </div>
              <Button variant="outline" size="sm" className="rounded-full bg-white" onClick={share}>
                <Copy /> {copied ? "복사했어요" : "결과 링크 복사"}
              </Button>
            </div>
            <Summary rows={results} />
            <div className="mt-4 space-y-3">
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground">성분과 함량을 넣으면 여기에 결과가 나와요.</p>
              ) : (
                results.map((r) => <ResultItem key={r.nutrientId} row={r} />)
              )}
            </div>
          </section>
        )}

        <Notice />
      </div>

      {/* 하단 고정 버튼: 성분을 하나라도 넣으면 나타남 */}
      {filledCount > 0 && (
      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background via-background/90 to-transparent px-4 pb-5 pt-8">
        <div className="mx-auto max-w-3xl">
          <Button
            size="lg"
            className="h-14 w-full rounded-2xl bg-[#0f3d34] text-base tracking-tight shadow-[0_12px_30px_-10px_rgba(15,61,52,0.55)] hover:bg-[#0c332b]"
            onClick={showResult}
          >
            영양제 {filledCount}개 결과 보기
            <ArrowRight className="size-5" aria-hidden />
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}

function Section({
  step,
  title,
  desc,
  action,
  children,
}: {
  step: number;
  title: string;
  desc: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="glass mb-5 rounded-3xl border border-white/70 p-5 shadow-[0_8px_30px_rgba(20,32,29,0.06)] sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {step}
          </span>
          <div>
            <h2 className="text-base font-bold sm:text-lg">{title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="text-sm">
      <span className="mb-1.5 block font-medium text-muted-foreground" id={`seg-${label}`}>
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={`seg-${label}`} className="grid h-11 grid-cols-2 rounded-xl bg-muted p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-lg text-sm font-semibold transition-all",
              value === o.value ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Summary({ rows }: { rows: ResultRow[] }) {
  const over = rows.filter((r) => r.status === "over").length;
  const near = rows.filter((r) => r.status === "near").length;
  const overlap = rows.filter((r) => r.sources.length > 1).length;
  const items = [
    { label: "상한 넘음", value: over, icon: AlertTriangle, tone: "from-red-50 to-white text-red-700", dot: "bg-red-100" },
    { label: "상한 근접", value: near, icon: TrendingUp, tone: "from-amber-50 to-white text-amber-700", dot: "bg-amber-100" },
    { label: "겹치는 성분", value: overlap, icon: Layers, tone: "from-indigo-50 to-white text-indigo-700", dot: "bg-indigo-100" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {items.map(({ label, value, icon: Icon, tone, dot }) => (
        <div key={label} className={cn("rounded-2xl border border-white bg-gradient-to-b p-3 shadow-sm sm:p-4", tone)}>
          <span className={cn("flex size-8 items-center justify-center rounded-full", dot)}>
            <Icon className="size-4" aria-hidden />
          </span>
          <p className="mt-2 text-xs font-semibold sm:text-sm">{label}</p>
          <p className="text-2xl font-bold text-foreground sm:text-3xl">
            {value}
            <span className="ml-0.5 text-sm font-semibold text-muted-foreground">개</span>
          </p>
        </div>
      ))}
    </div>
  );
}

const STATUS = {
  over: { text: "상한섭취량을 넘어요", chip: "bg-red-100 text-red-800", ring: "#dc2626", icon: AlertTriangle },
  near: { text: "상한섭취량에 가까워요", chip: "bg-amber-100 text-amber-900", ring: "#d97706", icon: TrendingUp },
  ok: { text: "상한섭취량 안쪽이에요", chip: "bg-emerald-100 text-emerald-800", ring: "#059669", icon: CheckCircle2 },
  none: { text: "상한섭취량 기준이 없는 성분", chip: "bg-slate-100 text-slate-700", ring: "#94a3b8", icon: Info },
  unknown: { text: "용량 확인이 필요해요", chip: "bg-slate-100 text-slate-700", ring: "#94a3b8", icon: CircleHelp },
} as const;

function Gauge({ pct, color }: { pct?: number; color: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const shown = pct === undefined ? 0 : Math.min(pct, 100);
  return (
    <div className="relative size-16 shrink-0" aria-hidden>
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#ecebe5" strokeWidth="7" />
        {pct !== undefined && (
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${(shown / 100) * c} ${c}`}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold">
        {pct === undefined ? "–" : `${pct}%`}
      </span>
    </div>
  );
}

function ResultItem({ row }: { row: ResultRow }) {
  const st = STATUS[row.status];
  const Icon = st.icon;
  const pct = row.ratio !== undefined && row.total > 0 ? Math.round(row.ratio * 100) : undefined;
  const partial = row.unknownSources.length > 0 && row.total > 0;
  return (
    <article className="flex gap-4 rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(20,32,29,0.04)] sm:p-5">
      <Gauge pct={pct} color={st.ring} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="mr-1 text-base font-bold">{row.name}</h3>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", st.chip)}>
            <Icon className="size-3.5" aria-hidden /> {st.text}
          </span>
          {row.sources.length > 1 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
              <Layers className="size-3.5" aria-hidden /> {row.sources.length}개 제품에 겹침
            </span>
          )}
        </div>
        <p className="mt-1.5 text-sm">
          {partial ? "아는 것만 더해서 " : "합계 "}
          <b>{row.total === 0 && row.unknownSources.length > 0 ? "?" : `${fmt(row.total)} ${row.baseUnit}`}</b>
          {row.ul !== undefined && (
            <span className="text-muted-foreground">
              {" "}
              / 상한 {fmt(row.ul)} {row.baseUnit}
            </span>
          )}
          {pct !== undefined && <span className="sr-only"> (상한 대비 {pct}%)</span>}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {row.sources.map((src) => (
            <span key={src} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {src}
              {row.unknownSources.includes(src) && " (용량 모름)"}
            </span>
          ))}
        </div>
        {row.unknownSources.length > 0 && (
          <p className="mt-1.5 text-xs font-medium text-amber-800">
            {partial ? "용량을 모르는 제품이 있어 실제 합계는 이보다 많아요. " : ""}
            라벨을 확인하면 정확하게 볼 수 있어요.
          </p>
        )}
        {row.ulNote && <p className="mt-1.5 text-xs text-muted-foreground">{row.ulNote}</p>}
      </div>
    </article>
  );
}

function Notice() {
  return (
    <aside className="mt-10 rounded-2xl border border-white/70 bg-white/60 p-5 text-xs leading-relaxed text-muted-foreground">
      <p className="flex items-center gap-1.5 font-semibold text-foreground">
        <Info className="size-4" aria-hidden /> 꼭 읽어 주세요
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        <li>입력한 함량과 공개된 섭취기준을 더해 본 참고용 계산이며, 의학적 조언이 아니에요.</li>
        <li>임신·수유 중이거나 복용 중인 약이 있다면 의사·약사와 상담하세요. 65세 이상은 아직 지원하지 않아요.</li>
        <li>음식으로 먹는 양은 포함하지 않아요. &lsquo;상한에 가까움&rsquo;은 상한의 {Math.round(NEAR_RATIO * 100)}% 이상일 때 표시해요.</li>
        <li>기준: {SOURCE_LABEL}</li>
      </ul>
    </aside>
  );
}

function fmt(x: number) {
  return x.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

/** 첫 화면 그래픽: 두 제품의 아연이 쌓여 상한선을 넘는 모습을 예시로 보여 준다 */
function HeroVisual() {
  const UL = 35;
  const max = 45;
  const parts = [
    { label: "종합비타민", amount: 8.5, cls: "from-[#cfe8dc] to-[#a9d4c2]" },
    { label: "아연·마그네슘", amount: 30, cls: "from-[#e9cf9a] to-[#d4a55a]" },
  ];
  const total = parts.reduce((a, b) => a + b.amount, 0);
  return (
    <figure
      className="relative mt-8 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0a2621] via-[#0e3a32] to-[#155446] p-6 text-white shadow-[0_20px_50px_-20px_rgba(15,92,77,0.6)] sm:p-8"
      aria-label="예시: 종합비타민 아연 8.5mg과 아연·마그네슘 30mg을 같이 먹으면 합계 38.5mg으로 상한 35mg의 110%"
    >
      {/* 떠 있는 캡슐 장식 */}
      <span aria-hidden className="capsule float-a absolute -right-5 top-7 h-11 w-28 rotate-[-28deg]" />
      <span aria-hidden className="capsule capsule-gold float-b absolute right-28 -top-3 h-7 w-16 rotate-[18deg]" />
      <span aria-hidden className="capsule float-c absolute -bottom-4 right-12 h-8 w-20 rotate-[12deg] opacity-70" />
      <span aria-hidden className="absolute -left-16 -top-16 size-48 rounded-full bg-emerald-300/20 blur-3xl" />

      <figcaption className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-emerald-100 ring-1 ring-white/15">
          예시 · 아연
        </span>
        <p className="mt-3 text-lg font-bold leading-snug sm:text-xl">
          따로 보면 괜찮은데,
          <br />
          합치면 <span className="text-[#e9c98a]">상한 110%</span>
        </p>
      </figcaption>

      <div className="relative mt-7" aria-hidden>
        <div className="relative h-11 rounded-2xl bg-white/10 p-1 ring-1 ring-white/10">
          <div className="flex h-full gap-1">
            {parts.map((p, i) => (
              <div
                key={p.label}
                className={cn("grow-bar h-full rounded-xl bg-gradient-to-r", p.cls)}
                style={{ width: `${(p.amount / max) * 100}%`, animationDelay: `${0.25 + i * 0.35}s` }}
              />
            ))}
          </div>
          {/* 상한선 */}
          <div className="absolute -bottom-2 -top-2 w-0.5 rounded bg-white" style={{ left: `${(UL / max) * 100}%` }}>
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#0f4a3e]">
              상한 {UL}mg
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-emerald-50/90">
          {parts.map((p) => (
            <span key={p.label} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-full bg-gradient-to-r", p.cls)} />
              {p.label} {p.amount}mg
            </span>
          ))}
          <span className="ml-auto font-semibold text-white">합계 {total}mg</span>
        </div>
      </div>
    </figure>
  );
}
