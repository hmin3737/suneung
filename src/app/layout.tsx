import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: '수능 자료실 - 기출문제 & 등급컷',
  description:
    '수능, 평가원, 교육청 모의고사 기출문제, 정답지, EBS 해설을 무료로 다운로드하세요. 등급컷 정보도 한눈에 확인.',
  keywords: '수능, 모의고사, 기출문제, 등급컷, 평가원, 교육청, EBS 해설',
  openGraph: {
    title: '수능 자료실',
    description: '수능/모의고사 기출문제 & 등급컷 무료 다운로드',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
