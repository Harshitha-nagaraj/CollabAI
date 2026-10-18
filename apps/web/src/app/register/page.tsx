'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRegister } from '@/lib/queries/auth';
import { useAppStore } from '@/lib/store';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const registerMutation = useRegister();
  const setToken = useAppStore((s) => s.setToken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const data = await registerMutation.mutateAsync({ name, email, password });
      if (data.token) {
        setToken(data.token);
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your credentials.');
    }
  };

  const handleDemoRegister = () => {
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
          <h1 className="text-xl font-bold tracking-tight text-[#2D2D2D]">Create your Account</h1>
          <p className="mt-1 text-xs text-[#5A5A5A]">Get started with CollabAI Enterprise Workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
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

          <Button type="submit" variant="primary" loading={registerMutation.isPending} className="w-full py-2.5">
            Create Account →
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-[#E2DACF] space-y-3 text-center">
          <Button
            type="button"
            variant="outline"
            onClick={handleDemoRegister}
            className="w-full py-2 text-xs font-semibold border-[#1F4D3A] text-[#1F4D3A] hover:bg-[#1F4D3A]/5"
          >
            ⚡ Direct Demo Entry (Skip Registration)
          </Button>

          <p className="text-xs text-[#5A5A5A]">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[#C96B4A] hover:underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
