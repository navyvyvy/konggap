import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "콩값장부",
    template: "%s | 콩값장부",
  },
  description: "배송비를 포함한 커피콩 최종가를 비교하고, 구매 판단 기준을 함께 확인하는 도구입니다.",
  other: {
    "google-adsense-account": "ca-pub-6996920182245498",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body suppressHydrationWarning>
        {children}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6996920182245498"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
