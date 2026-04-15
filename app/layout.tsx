import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AIO Dijital | Geri Bildirim Ödül Paneli',
  description:
    'Gerçek müşteri geri bildirimi toplayan, kullanıcı cüzdanı ve ödeme talebi süreçlerini yöneten panel.',
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
