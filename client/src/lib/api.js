import axios from "axios";
import { useToastStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";


const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});



api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


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
        if (url.includes("/auth/login")) {
          return Promise.reject(error); // Let the login page handle the error
        }
        // when a user is logged out i guess
        const { token } = useAuthStore.getState();
        if (!token) return Promise.reject(error);


        if (!isAuthPath && !isIgnored && ! useAuthStore.getState().redirecting401) {
          useAuthStore.getState().setRedirecting401(true);
          try {
            useAuthStore.getState().setToken(undefined);
          } catch {}
          window.location.href = "/login";
          return;
        }
      }
    }
    const isLoginError = error?.config?.url?.includes("/auth/login");
    if(!isLoginError){
    try {
      const message = error?.response?.data?.message || error?.message || "Request failed";
      useToastStore.getState().show(message, "error", 4000);
    } catch {}
  }
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
  setTags: (id, tag_ids) => api.put(`/agent/tickets/${id}`, {tag_ids}).then((r)=> r.data),
  getPriorities: () => api.get("/tickets/priorities").then((r) => r.data),
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


