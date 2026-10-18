'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F5F2]">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F4D3A] text-lg font-bold text-white shadow-sm animate-pulse">
          C
        </div>
        <p className="text-xs font-semibold text-[#5A5A5A]">Loading CollabAI Workspace...</p>
      </div>
    </div>
  );
}
