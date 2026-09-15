import type { Metadata } from 'next';
import { Cormorant_Garamond, Noto_Sans_JP, Noto_Serif_JP } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-cormorant'
});
const notoSerifJp = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-noto-serif-jp'
});
const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-noto-sans-jp'
});

export const metadata: Metadata = {
  title: 'THE THIRDPLACE EBISU | EVENT ATTENDANCE',
  description: '出欠確認ページ'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${cormorant.variable} ${notoSerifJp.variable} ${notoSansJp.variable}`}>
      <body className="bg-base text-cream font-sans font-light">{children}</body>
    </html>
  );
}
