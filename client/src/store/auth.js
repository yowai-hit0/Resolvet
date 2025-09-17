"use client";

import { create } from "zustand";
import { AuthAPI, setAuthTokenGetter } from "@/lib/api";

export const useAuthStore = create((set, get) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("auth_token") || undefined : undefined,
  user: undefined,
  loading: false,
  error: undefined,
  loginInProgress: false,
  redirecting401: false,
  setRedirecting401: (val) => set({redirecting401: val}),

  setToken: (token) => {
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("auth_token", token);
      else localStorage.removeItem("auth_token");
    }
    set({ token });
  },
  setUser: (user) => set({ user }),

  bootstrap: async () => {
    try {
      set({ loading: true, error: undefined });
      // if token not in memory, hydrate from storage
      const stored = typeof window !== "undefined" ? localStorage.getItem("auth_token") : undefined;
      if (stored && !get().token) {
        set({ token: stored });
      }
      const data = await AuthAPI.profile();
      // expect { data: { user, token? } } or { user }
      const user = data?.data?.user || data?.user || data;
      set({ user });
    } catch (err) {
      set({ user: undefined });
    } finally {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    set({  loginInProgress: true,error: undefined });
    try {
      const data = await AuthAPI.login({ email, password });
      const token = data?.data?.token || data?.token;
      const user = data?.data?.user || data?.user;
      get().setToken(token);
      set({ user });
      return { token, user };
    } catch (err) {
      const message = err?.response?.data?.message || "Login failed";
      set({ error: message });
      // throw err;
      return({error:message})
    } finally {
      set({ loginInProgress: false });
    }
  },

  logout: () => {
    if (typeof window !== "undefined") localStorage.removeItem("auth_token");
    set({ token: undefined, user: undefined });
  },
}));
