import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AIO Dijital | YouTube Video Otomasyonu',
  description: 'Manus AI videolarını otomatik olarak YouTube Shorts olarak yayınlama sistemi.',
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
