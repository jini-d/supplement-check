import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "영양제 조합 체크",
  description: "같이 먹는 영양제의 겹치는 성분과 하루 상한섭취량 대비 비율을 한 번에 확인해 보세요.",
  openGraph: {
    title: "영양제 조합 체크",
    description: "같이 먹는 영양제, 겹치거나 너무 많지 않을까? 성분별 합계와 상한섭취량 대비 비율을 확인해 보세요.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
