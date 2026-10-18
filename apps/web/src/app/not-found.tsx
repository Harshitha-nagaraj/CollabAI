import Link from 'next/link';
import { Button } from '@/components/ui/button';


export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F5F2] px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1F4D3A] text-2xl font-bold text-white shadow-xs mb-6">
        404
      </div>
      <h1 className="text-2xl font-bold text-[#2D2D2D] tracking-tight">Page Not Found</h1>
      <p className="mt-2 text-xs text-[#5A5A5A] max-w-sm">
        The requested page does not exist or has been moved within CollabAI Workspace.
      </p>
      <div className="mt-6">
        <Link href="/dashboard">
          <Button variant="primary">Return to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
