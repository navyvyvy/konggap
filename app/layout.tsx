import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "콩값 장부",
  description: "배송비 포함 커피콩 최저가 탐색",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
