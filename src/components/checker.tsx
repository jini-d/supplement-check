"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { AlertTriangle, CheckCircle2, Copy, Info, Layers, Plus, Sparkles, Trash2, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NUTRIENTS, NUTRIENT_MAP, SOURCE_LABEL, type AgeGroup, type Sex } from "@/data/nutrients";
import { calculate, NEAR_RATIO, type Ingredient, type Profile, type ResultRow, type Supplement } from "@/lib/calc";
import { decodeState, encodeState } from "@/lib/share";
import { cn } from "@/lib/utils";

const uid = () => Math.random().toString(36).slice(2, 9);
const emptyIngredient = (): Ingredient => ({ nutrientId: "", amount: 0, unit: "" });
const emptySupplement = (): Supplement => ({ id: uid(), name: "", ingredients: [emptyIngredient()] });

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
  const filledCount = supplements.filter((s) => s.ingredients.some((i) => i.nutrientId && i.amount > 0)).length;

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
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-10 sm:pt-14">
      <header className="mb-8">
        <p className="text-sm font-semibold text-primary">영양제 조합 체크</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">같이 먹는 영양제, 겹치거나 너무 많지 않을까?</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          라벨에 적힌 성분과 함량을 넣으면 성분별 합계, 여러 제품에 겹치는 성분, 하루 상한섭취량 대비 비율을 한 번에 보여 드려요.
        </p>
      </header>

      {/* 1. 기본 정보 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>1. 기본 정보</CardTitle>
          <CardDescription>칼슘처럼 성별·나이에 따라 상한섭취량이 다른 성분이 있어요.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">성별</span>
            <NativeSelect value={profile.sex} onChange={(e) => setProfile({ ...profile, sex: e.target.value as Sex })}>
              <option value="female">여성</option>
              <option value="male">남성</option>
            </NativeSelect>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">나이</span>
            <NativeSelect value={profile.age} onChange={(e) => setProfile({ ...profile, age: e.target.value as AgeGroup })}>
              <option value="19-29">19~29세</option>
              <option value="30-49">30~49세</option>
              <option value="50-64">50~64세</option>
            </NativeSelect>
          </label>
        </CardContent>
      </Card>

      {/* 2. 영양제 입력 */}
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">2. 먹고 있는 영양제</h2>
          <p className="mt-1 text-sm text-muted-foreground">제품 라벨의 &lsquo;1일 섭취량 기준&rsquo; 함량을 넣어 주세요.</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSupplements(EXAMPLE.map((s) => ({ ...s, id: uid() })));
            track("example_loaded");
          }}
        >
          <Sparkles /> 예시로 채우기
        </Button>
      </div>

      <div className="space-y-3">
        {supplements.map((s, sIdx) => (
          <Card key={s.id}>
            <CardContent className="space-y-3 pt-5">
              <div className="flex items-center gap-2">
                <Input
                  aria-label={`영양제 ${sIdx + 1} 이름`}
                  placeholder={`영양제 ${sIdx + 1} 이름 (예: 종합비타민)`}
                  value={s.name}
                  onChange={(e) => updateSupplement(s.id, { name: e.target.value })}
                  className="font-medium"
                />
                {supplements.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`영양제 ${sIdx + 1} 삭제`}
                    onClick={() => setSupplements((list) => list.filter((x) => x.id !== s.id))}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>

              {s.ingredients.map((ing, iIdx) => {
                const n = NUTRIENT_MAP[ing.nutrientId];
                return (
                  <div key={iIdx} className="grid grid-cols-[1fr_1fr_36px] gap-2 border-t pt-3 first-of-type:border-t-0 sm:grid-cols-[1fr_120px_110px_36px] sm:border-t-0 sm:pt-0">
                    <NativeSelect
                      className="col-span-3 sm:col-span-1"
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
                      aria-label="함량"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      placeholder="함량"
                      value={ing.amount || ""}
                      onChange={(e) => updateIngredient(s.id, iIdx, { amount: Number(e.target.value) })}
                    />
                    <NativeSelect
                      aria-label="단위"
                      value={ing.unit}
                      disabled={!n}
                      onChange={(e) => updateIngredient(s.id, iIdx, { unit: e.target.value })}
                    >
                      {n ? n.units.map((u) => <option key={u.label}>{u.label}</option>) : <option value="">단위</option>}
                    </NativeSelect>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="성분 삭제"
                      disabled={s.ingredients.length === 1}
                      onClick={() =>
                        updateSupplement(s.id, { ingredients: s.ingredients.filter((_, i) => i !== iIdx) })
                      }
                    >
                      <X />
                    </Button>
                  </div>
                );
              })}

              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSupplement(s.id, { ingredients: [...s.ingredients, emptyIngredient()] })}
              >
                <Plus /> 성분 추가
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button
          variant="outline"
          className="sm:flex-1"
          onClick={() => {
            setSupplements((list) => [...list, emptySupplement()]);
            track("supplement_added", { count: supplements.length + 1 });
          }}
        >
          <Plus /> 영양제 추가
        </Button>
        <Button size="lg" className="sm:flex-1" disabled={filledCount === 0} onClick={showResult}>
          결과 보기
        </Button>
      </div>

      {/* 3. 결과 */}
      {shown && (
        <section ref={resultRef} className="mt-12 scroll-mt-6" aria-labelledby="result-title">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 id="result-title" className="text-xl font-bold">
              결과
            </h2>
            <Button variant="outline" size="sm" onClick={share}>
              <Copy /> {copied ? "링크를 복사했어요" : "결과 링크 복사"}
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
          <Notice />
        </section>
      )}

      {!shown && <Notice />}
    </div>
  );
}

function Summary({ rows }: { rows: ResultRow[] }) {
  const over = rows.filter((r) => r.status === "over").length;
  const near = rows.filter((r) => r.status === "near").length;
  const overlap = rows.filter((r) => r.sources.length > 1).length;
  const items = [
    { label: "상한 넘음", value: over, icon: AlertTriangle, tone: "text-red-700" },
    { label: "상한에 가까움", value: near, icon: TrendingUp, tone: "text-amber-700" },
    { label: "겹치는 성분", value: overlap, icon: Layers, tone: "text-indigo-700" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(({ label, value, icon: Icon, tone }) => (
        <div key={label} className="rounded-xl border bg-card p-3 sm:p-4">
          <div className={cn("flex items-center gap-1.5 text-xs font-semibold sm:text-sm", tone)}>
            <Icon className="size-4" aria-hidden /> {label}
          </div>
          <p className="mt-1 text-2xl font-bold">{value}개</p>
        </div>
      ))}
    </div>
  );
}

const STATUS = {
  over: { text: "상한섭취량을 넘어요", variant: "over", icon: AlertTriangle, bar: "bg-red-600" },
  near: { text: "상한섭취량에 가까워요", variant: "near", icon: TrendingUp, bar: "bg-amber-500" },
  ok: { text: "상한섭취량 안쪽이에요", variant: "ok", icon: CheckCircle2, bar: "bg-emerald-600" },
  none: { text: "상한섭취량이 정해지지 않은 성분", variant: "info", icon: Info, bar: "bg-slate-400" },
} as const;

function ResultItem({ row }: { row: ResultRow }) {
  const st = STATUS[row.status];
  const Icon = st.icon;
  const pct = row.ratio !== undefined ? Math.round(row.ratio * 100) : undefined;
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-1 text-base font-semibold">{row.name}</h3>
          <Badge variant={st.variant}>
            <Icon aria-hidden /> {st.text}
          </Badge>
          {row.sources.length > 1 && (
            <Badge variant="overlap">
              <Layers aria-hidden /> {row.sources.length}개 제품에 겹침
            </Badge>
          )}
        </div>

        <p className="mt-2 text-sm">
          합계 <b>{fmt(row.total)} {row.baseUnit}</b>
          {row.ul !== undefined && (
            <>
              {" "}
              / 상한 {fmt(row.ul)} {row.baseUnit} <span className="text-muted-foreground">({pct}%)</span>
            </>
          )}
        </p>

        {pct !== undefined && (
          <div
            className="relative mt-2 h-2 overflow-hidden rounded-full bg-muted"
            role="meter"
            aria-label={`${row.name} 상한섭취량 대비`}
            aria-valuemin={0}
            aria-valuemax={150}
            aria-valuenow={Math.min(pct, 150)}
          >
            <div className={cn("h-full rounded-full", st.bar)} style={{ width: `${Math.min(pct, 150) / 1.5}%` }} />
            {/* 100% 위치 표시 */}
            <div className="absolute inset-y-0 w-0.5 bg-foreground/60" style={{ left: `${100 / 1.5}%` }} aria-hidden />
          </div>
        )}

        <p className="mt-2 text-xs text-muted-foreground">
          들어 있는 제품: {row.sources.join(", ")}
          {row.ulNote ? ` · ${row.ulNote}` : ""}
        </p>
      </CardContent>
    </Card>
  );
}

function Notice() {
  return (
    <aside className="mt-8 rounded-xl bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
      <p className="font-semibold text-foreground">꼭 읽어 주세요</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4">
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
