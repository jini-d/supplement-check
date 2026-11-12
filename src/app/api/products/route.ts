import { NextResponse } from "next/server";
import { parseStandard } from "@/lib/parse-standard";

/**
 * 제품명 검색: 식약처 식품안전나라 "건강기능식품 품목제조 신고사항 현황"(I0030)
 * 인증키가 화면 코드에 드러나지 않도록 서버에서만 호출한다.
 */

type Row = {
  PRDLST_NM?: string; // 제품명
  BSSH_NM?: string; // 업체명
  PRDLST_REPORT_NO?: string; // 품목제조번호
  NTK_MTHD?: string; // 섭취 방법
  STDR_STND?: string; // 기준 및 규격 (표시량이 들어 있음)
};

const BASE = "http://openapi.foodsafetykorea.go.kr/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ error: "두 글자 이상 입력해 주세요." }, { status: 400 });

  const key = process.env.FOOD_API_KEY;
  if (!key) return NextResponse.json({ error: "제품 검색을 준비 중이에요." }, { status: 503 });

  const url = `${BASE}/${key}/I0030/json/1/20/PRDLST_NM=${encodeURIComponent(q)}`;
  try {
    // 같은 검색어는 하루 동안 캐시해서 식약처 호출을 줄인다
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const body = data?.I0030;
    const code: string | undefined = body?.RESULT?.CODE;
    if (code === "INFO-200") return NextResponse.json({ items: [] }); // 결과 없음
    if (code && code !== "INFO-000") throw new Error(code);

    const rows: Row[] = body?.row ?? [];
    const items = rows.map((r) => {
      const parsed = parseStandard(r.STDR_STND);
      return {
        id: r.PRDLST_REPORT_NO ?? `${r.BSSH_NM}-${r.PRDLST_NM}`,
        name: r.PRDLST_NM ?? "",
        company: r.BSSH_NM ?? "",
        intake: r.NTK_MTHD ?? "",
        ingredients: parsed.ingredients,
        skipped: parsed.skipped,
        // 파싱이 안 맞는 제품을 확인할 수 있게 원문도 짧게 돌려준다
        ...(searchParams.get("raw") === "1" ? { standard: r.STDR_STND ?? "" } : {}),
      };
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[products]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "식약처 데이터를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
