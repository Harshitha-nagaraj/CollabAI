import './globals.css';
import { Providers } from '@/components/providers';

export const metadata = {
  title: 'CollabAI — Enterprise AI Workspace',
  description: 'AI-Powered Intelligent Collaboration Workspace & Agile Management System',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#F7F5F2] text-[#2D2D2D] min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
