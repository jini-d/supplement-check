import type { Profile, Supplement } from "@/lib/calc";

/**
 * 결과를 서버 없이 공유하기 위해 입력 내용을 URL 해시에 담는다.
 * 짧게 만들려고 키를 줄인 형태로 저장한다.
 */
type Packed = { p: [Profile["sex"], Profile["age"]]; s: [string, [string, number, string][]][] };

export function encodeState(profile: Profile, supplements: Supplement[]): string {
  const packed: Packed = {
    p: [profile.sex, profile.age],
    s: supplements.map((s) => [s.name, s.ingredients.map((i) => [i.nutrientId, i.amount, i.unit])]),
  };
  const json = JSON.stringify(packed);
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeState(hash: string): { profile: Profile; supplements: Supplement[] } | null {
  try {
    const b64 = hash.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const packed = JSON.parse(new TextDecoder().decode(bytes)) as Packed;
    return {
      profile: { sex: packed.p[0], age: packed.p[1] },
      supplements: packed.s.map(([name, ings], idx) => ({
        id: `s${idx}-${Date.now()}`,
        name,
        ingredients: ings.map(([nutrientId, amount, unit]) => ({ nutrientId, amount, unit })),
      })),
    };
  } catch {
    return null;
  }
}
