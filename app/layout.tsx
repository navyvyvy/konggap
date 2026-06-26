import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "생두 가격 비교",
  description: "조회 시점 생두 가격 비교 도구",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
