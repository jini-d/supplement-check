# 영양제 조합 체크

같이 먹는 영양제의 성분을 넣으면 **성분별 합계, 여러 제품에 겹치는 성분, 하루 상한섭취량 대비 비율**을 한 번에 보여 주는 웹 서비스입니다.

- 기준: 보건복지부·한국영양학회, 「2025 한국인 영양소 섭취기준」 성인 19~64세
- 진단·추천을 하지 않는 참고용 계산이며, 결과 화면마다 안내 문구를 둡니다.

## 기능 (MVP)

- 성별·나이 선택 (칼슘처럼 성별·나이에 따라 상한이 다른 성분 반영)
- 영양제 여러 개, 제품별 성분·함량 입력 (비타민D IU ↔ µg, mg ↔ µg 단위 환산)
- 결과: 상한 넘음 / 상한에 가까움(80% 이상) / 겹치는 성분 요약, 성분별 합계와 비율 막대
- 결과 링크 복사: 서버 없이 입력 내용을 URL 해시에 담아 공유
- 측정: Vercel Analytics 방문 + 이벤트(`example_loaded`, `supplement_added`, `result_viewed`, `share_clicked`, `shared_link_opened`)

빼 둔 것: 회원가입, 결제, 제품명 검색(식약처 API), 의약품 상호작용, 개인 맞춤 추천

## 기술

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui 형식 컴포넌트 · lucide-react · Vercel Analytics

> shadcn 레지스트리에 접속할 수 없는 환경에서 만들어서 `src/components/ui/`의 Button·Card·Input·Badge는 shadcn과 같은 구조로 직접 작성했습니다. 로컬에서 `npx shadcn@latest init` 후 `add`로 바꿔도 됩니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 배포 전 빌드 확인
```

## 배포 (Vercel)

1. GitHub에 이 폴더를 올립니다.
2. vercel.com → Add New → Project → 저장소 선택 → Deploy (설정 변경 없음)
3. 프로젝트 → Analytics 탭에서 Web Analytics를 켭니다. 이벤트(custom events)는 요금제에 따라 보이지 않을 수 있습니다.

## 출시 전에 꼭 확인할 것

- [ ] `src/data/nutrients.ts`에서 `verified: false`인 항목(비타민 E, 비타민 B6, 칼슘, 마그네슘)의 상한섭취량을 2025 섭취기준 원문 표와 대조
- [ ] 비타민 A는 µg RAE만 받음. 라벨이 IU인 제품은 안내 문구 필요할지 결정
- [ ] `NEAR_RATIO`(현재 0.8) 확정
- [ ] 안내 문구 최종 확인

## 파일 구조

```
src/
  app/            layout(메타·Analytics), page
  components/
    checker.tsx   입력·결과·공유 화면 전체
    ui/           shadcn 형식 기본 컴포넌트
  data/nutrients.ts  성분·단위·상한섭취량 (출처 주석)
  lib/calc.ts     합계·겹침·판정 로직
  lib/share.ts    결과 링크 인코딩/디코딩
```
