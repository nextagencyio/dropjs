import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'DropJS Admin',
  description: 'DropJS content management system',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
