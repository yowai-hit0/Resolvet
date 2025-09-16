import axios from "axios";
import { useToastStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Token injection via setter to avoid circular import from the store
let getAuthToken = () => undefined;
export const setAuthTokenGetter = (getter) => {
  getAuthToken = getter;
};

api.interceptors.request.use((config) => {
  const token = getAuthToken?.();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRedirecting401 = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      if (typeof window !== "undefined") {
        const url = error?.config?.url || "";
        const path = window.location.pathname;
        const isAuthPath = path.startsWith("/login") || path.startsWith("/register");
        const isIgnored = url.includes("/auth/login") || url.includes("/health");
        // Clear token on 401
        try { useAuthStore.getState().setToken(undefined); } catch {}
        if (!isAuthPath && !isIgnored && !isRedirecting401) {
          isRedirecting401 = true;
          window.location.href = "/login";
          return; // prevent further handling
        }
      }
    }
    try {
      const message = error?.response?.data?.message || error?.message || "Request failed";
      useToastStore.getState().show(message, "error", 4000);
    } catch {}
    return Promise.reject(error);
  }
);

// Basic helpers
export const AuthAPI = {
  login: (payload) => api.post("/auth/login", payload).then((r) => r.data),
  register: (payload) => api.post("/auth/register", payload).then((r) => r.data),
  profile: () => api.get("/users/me").then((r) => r.data),
  logout: () => Promise.resolve(),
};

export const TicketsAPI = {
  list: (params) => api.get("/tickets", { params }).then((r) => r.data),
  get: (id) => api.get(`/tickets/${id}`).then((r) => r.data),
};

export const AdminAPI = {
  systemAnalytics: () => api.get("/admin/analytics/system").then((r) => r.data),
  agentPerformance: () => api.get("/admin/analytics/agent-performance").then((r) => r.data),
  bulkAssign: (payload) => api.post("/admin/tickets/bulk-assign", payload).then((r) => r.data),
  bulkStatus: (payload) => api.post("/admin/tickets/bulk-status", payload).then((r) => r.data),
};

export const AgentAPI = {
  dashboard: () => api.get("/agent/dashboard").then((r) => r.data),
  myTickets: (params) => api.get("/agent/tickets", { params }).then((r) => r.data),
  setStatus: (id, status) => api.patch(`/agent/tickets/${id}/status`, { status }).then((r) => r.data),
  setPriority: (id, priority_id) => api.patch(`/agent/tickets/${id}/priority`, { priority_id }).then((r) => r.data),
};

export const UsersAPI = {
  list: (params) => api.get("/users", { params }).then((r) => r.data),
};

export const HealthAPI = {
  check: () => api.get("/health").then((r) => r.data),
};

export const PrioritiesAPI = {
  list: () => api.get("/tickets/priorities").then((r) => r.data),
  create: (payload) => api.post("/tickets/priorities", payload).then((r) => r.data),
  update: (id, payload) => api.put(`/tickets/priorities/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/tickets/priorities/${id}`).then((r) => r.data),
};


