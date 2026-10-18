'use client';

import { create } from 'zustand';

interface AppState {
  token: string | null;
  selectedWorkspaceId: string | null;
  selectedProjectId: string | null;

  setToken: (token: string | null) => void;
  setSelectedWorkspaceId: (id: string | null) => void;
  setSelectedProjectId: (id: string | null) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  token: null,
  selectedWorkspaceId: null,
  selectedProjectId: null,

  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token });
  },

  setSelectedWorkspaceId: (id) => {
    if (id) localStorage.setItem('workspaceId', id);
    else localStorage.removeItem('workspaceId');
    set({ selectedWorkspaceId: id, selectedProjectId: null });
  },

  setSelectedProjectId: (id) => {
    if (id) localStorage.setItem('projectId', id);
    else localStorage.removeItem('projectId');
    set({ selectedProjectId: id });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('workspaceId');
    localStorage.removeItem('projectId');
    set({ token: null, selectedWorkspaceId: null, selectedProjectId: null });
  },

  hydrate: () => {
    let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token && typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      token = 'demo-token';
      localStorage.setItem('token', token);
    }
    const workspaceId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') : null;
    const projectId = typeof window !== 'undefined' ? localStorage.getItem('projectId') : null;
    set({
      token,
      selectedWorkspaceId: workspaceId,
      selectedProjectId: projectId,
    });
  },
}));
