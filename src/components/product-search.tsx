"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NUTRIENT_MAP } from "@/data/nutrients";
import type { ParsedIngredient } from "@/lib/parse-standard";

export type Product = {
  id: string;
  name: string;
  company: string;
  intake: string;
  ingredients: ParsedIngredient[];
  skipped: string[];
};

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; items: Product[] }
  | { kind: "error"; message: string };

/** 제품명으로 식약처 신고 정보를 찾아 성분·표시량을 채운다 */
export function ProductSearch({ onPick, onClose }: { onPick: (p: Product) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (query.length < 2) return;
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "검색에 실패했어요.");
      setState({ kind: "done", items: data.items });
      track("product_searched", { found: data.items.length });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "검색에 실패했어요." });
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-primary/15 bg-secondary/50 p-3">
      <form onSubmit={search} className="flex gap-2" role="search">
        <Input
          autoFocus
          aria-label="제품명"
          placeholder="제품명 (예: 멀티비타민)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-10 rounded-lg bg-white"
        />
        <Button type="submit" size="sm" className="h-10 shrink-0 rounded-lg px-4" disabled={q.trim().length < 2}>
          {state.kind === "loading" ? <Loader2 className="animate-spin" /> : <Search />} 찾기
        </Button>
      </form>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        식약처에 신고된 국내 건강기능식품만 나와요. 해외 직구 제품은 직접 입력해 주세요.
      </p>

      <div aria-live="polite">
        {state.kind === "error" && <p className="mt-2 text-sm text-red-700">{state.message}</p>}
        {state.kind === "done" && state.items.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">찾는 제품이 없어요. 이름을 짧게 바꿔 보세요.</p>
        )}
        {state.kind === "done" && state.items.length > 0 && (
          <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto">
            {state.items.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={p.ingredients.length === 0}
                  className="w-full rounded-lg border bg-white p-3 text-left transition-colors hover:border-primary/40 disabled:opacity-60"
                  onClick={() => {
                    onPick(p);
                    track("product_selected", { nutrients: p.ingredients.length });
                  }}
                >
                  <span className="block text-sm font-semibold">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">{p.company}</span>
                  <span className="mt-1 block text-xs text-foreground/80">
                    {p.ingredients.length > 0
                      ? p.ingredients.map((i) => `${NUTRIENT_MAP[i.nutrientId]?.name} ${i.amount}${i.unit}`).join(" · ")
                      : "표시량을 읽지 못한 제품이에요"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" onClick={onClose} className="mt-2 text-xs font-medium text-muted-foreground hover:underline">
        닫기
      </button>
    </div>
  );
}
