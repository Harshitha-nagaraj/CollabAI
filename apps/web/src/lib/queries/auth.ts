import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { User } from '@/types';

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: string;
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const data = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (data?.token && typeof window !== 'undefined') {
        localStorage.setItem('token', data.token);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) =>
      api<LoginResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}

import { useAppStore } from '@/lib/store';

export function useCurrentUser(enabled = true) {
  const token = useAppStore((s) => s.token);
  return useQuery({
    queryKey: ['currentUser', token],
    queryFn: () => api<{ user: User }>('/auth/me'),
    enabled: enabled && !!token,
    retry: false,
    staleTime: 60 * 1000,
  });
}
