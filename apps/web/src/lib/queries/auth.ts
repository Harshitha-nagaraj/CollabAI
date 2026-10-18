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
    mutationFn: (payload: LoginPayload) =>
      api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
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

export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api<{ user: User }>('/auth/me'),
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
