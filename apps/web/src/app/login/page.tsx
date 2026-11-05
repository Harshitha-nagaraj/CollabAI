'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLogin } from '@/lib/queries/auth';
import { useAppStore } from '@/lib/store';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const loginMutation = useLogin();
  const setToken = useAppStore((s) => s.setToken);
  const setSelectedWorkspaceId = useAppStore((s) => s.setSelectedWorkspaceId);

  // Development shortcuts: only available when explicitly enabled in non-production environments
  const showDevShortcuts =
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_ENABLE_DEV_SHORTCUTS === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('workspaceId');
        localStorage.removeItem('projectId');
      }
      setSelectedWorkspaceId(null);
      const data = await loginMutation.mutateAsync({ email, password });
      if (data.token) {
        setToken(data.token);
      }
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
    }
  };

  const handleDemoLogin = () => {
    setToken('demo-token');
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F5F2] px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm rounded-2xl border border-[#E2DACF] bg-white p-8 shadow-xl"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1F4D3A] text-xl font-bold text-white shadow-sm">
            C
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#2D2D2D]">Sign in to CollabAI</h1>
          <p className="mt-1 text-xs text-[#5A5A5A]">Enterprise Collaborative Workspace & Intelligence</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="text-xs font-semibold text-[#C93B3B] bg-[#C93B3B]/10 p-2.5 rounded-md border border-[#C93B3B]/20">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" loading={loginMutation.isPending} className="w-full py-2.5">
            Sign In →
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-[#E2DACF] space-y-3 text-center">
          {showDevShortcuts && (
            <>
              <div className="grid grid-cols-2 gap-2" data-testid="dev-login-shortcuts">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEmail('alpha.tester@collabai.internal');
                    setPassword('Password123!');
                  }}
                  className="py-1.5 text-[11px] font-semibold border-[#1F4D3A] text-[#1F4D3A] hover:bg-[#1F4D3A]/5 cursor-pointer"
                >
                  🔑 Alpha Tester
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEmail('beta.tester@collabai.internal');
                    setPassword('Password123!');
                  }}
                  className="py-1.5 text-[11px] font-semibold border-[#8C857B] text-[#525B56] hover:bg-[#F0EEE6] cursor-pointer"
                >
                  🔑 Beta Tester
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleDemoLogin}
                className="w-full py-2 text-xs font-semibold border-[#1F4D3A] text-[#1F4D3A] hover:bg-[#1F4D3A]/5 cursor-pointer"
                data-testid="dev-demo-token-button"
              >
                ⚡ Direct Demo Login (Skip Authentication)
              </Button>
            </>
          )}

          <p className="text-xs text-[#5A5A5A]">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-[#C96B4A] hover:underline underline-offset-2">
              Create an account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
