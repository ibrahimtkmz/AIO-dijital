import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AIO Dijital | Otomatik Haber Operasyon Merkezi',
  description:
    'RSS haberlerini güvenli biçimde keşfeden ve video otomasyonuna hazırlayan yönetim platformu.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
