import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "콩값장부",
  description: "배송비까지 더한 커피콩 최저가 모음",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
