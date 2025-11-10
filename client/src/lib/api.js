import axios from "axios";
import { useToastStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";


const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001/api/v1";

// Simple in-memory cooldowns to avoid hammering the backend on repeated failures
// Map key: `${method}|${url}` -> timestamp (ms) when cooldown ends
const requestCooldowns = new Map();

function getRequestKey(config) {
  const method = (config?.method || "get").toLowerCase();
  // Use full URL if axios resolved it, else use provided path
  const url = config?.url || "";
  return `${method}|${url}`;
}

function isOnCooldown(config) {
  const key = getRequestKey(config);
  const endsAt = requestCooldowns.get(key) || 0;
  return Date.now() < endsAt;
}

function setCooldown(config, ms) {
  const key = getRequestKey(config);
  requestCooldowns.set(key, Date.now() + ms);
}

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});



api.interceptors.request.use((config) => {
  // Short-circuit requests that are currently on cooldown
  if (isOnCooldown(config)) {
    // Do not send the request; surface a lightweight client-side error
    return Promise.reject(new Error("request_on_cooldown"));
  }
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
    // Ignore locally cancelled cooldown errors
    if (error instanceof Error && error.message === "request_on_cooldown") {
      return Promise.reject(error);
    }

    const status = error?.response?.status;
    const url = error?.config?.url || "";

    // Handle Authentication Errors (401)
    if (status === 401) {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        const isAuthPath = path.startsWith("/login") || path.startsWith("/register");
        const isIgnored = url.includes("/auth/login") || url.includes("/health");
        
        // Let login page handle login errors
        if (url.includes("/auth/login")) {
          return Promise.reject(error);
        }

        // Clear token on 401
        const { token } = useAuthStore.getState();
        if (!token) return Promise.reject(error);

        // Redirect to login if not already on auth page
        if (!isAuthPath && !isIgnored && !useAuthStore.getState().redirecting401) {
          useAuthStore.getState().setRedirecting401(true);
          try {
            useAuthStore.getState().setToken(undefined);
            useAuthStore.getState().setUser(undefined);
            if (typeof window !== "undefined") {
              localStorage.removeItem("auth_token");
            }
          } catch {}
          
          // Preserve attempted URL for post-login redirect
          const attemptedUrl = window.location.pathname + window.location.search;
          if (attemptedUrl !== "/login" && attemptedUrl !== "/register") {
            sessionStorage.setItem("redirect_after_login", attemptedUrl);
            // Store session expired message
            sessionStorage.setItem("session_expired", "true");
          }
          
          window.location.href = "/login";
          return Promise.reject(error);
        }
      }
    }

    // Handle Authorization Errors (403)
    if (status === 403) {
      const message = error?.response?.data?.message || "Access Denied";
      useToastStore.getState().show(message, "error", 4000);
      return Promise.reject(error);
    }

    // Handle Client Errors (400, 422)
    if (status === 400 || status === 422) {
      const message = error?.response?.data?.message || "Invalid request";
      // Don't show toast for validation errors on login/register
      const isAuthError = url.includes("/auth/login") || url.includes("/auth/register");
      if (!isAuthError) {
        useToastStore.getState().show(message, "error", 4000);
      }
      return Promise.reject(error);
    }

    // Handle Server Errors (500+)
    if (status >= 500) {
      const cfg = error?.config || {};
      // Detect known Prisma enum error to increase cooldown
      const message = error?.response?.data?.message || error?.message || "";
      const isPrismaEnumErr = message.includes('invalid input value for enum') || message.includes('TicketStatus');
      // 5s default; 30s for known noisy errors
      setCooldown(cfg, isPrismaEnumErr ? 30000 : 5000);
      
      // Show generic error message with retry option
      const isLoginError = url.includes("/auth/login");
      if (!isLoginError) {
        const onCooldown = isOnCooldown(cfg);
        if (!onCooldown) {
          try {
            useToastStore.getState().show("Server error. Please try again.", "error", 4000);
          } catch {}
        }
      }
    }

    // Handle Network Errors
    if (!error.response && error.request) {
      const isLoginError = url.includes("/auth/login");
      if (!isLoginError) {
        try {
          useToastStore.getState().show("Network error. Please check your connection.", "error", 4000);
        } catch {}
      }
    }

    return Promise.reject(error);
  }
);

// Basic helpers
export const AuthAPI = {
  login: (payload) => api.post("/auth/login", payload).then((r) => r.data),
  register: (payload) => api.post("/auth/register", payload).then((r) => r.data),
  profile: () => api.get("/auth/profile").then((r) => r.data),
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


export const InvitesAPI = {
  create: (payload) => api.post('/invites', payload).then((r) => r.data),
  list: (params) => api.get('/invites', { params }).then((r) => r.data),
  resend: (id) => api.post(`/invites/${id}/resend`).then((r) => r.data),
  revoke: (id) => api.post(`/invites/${id}/revoke`).then((r) => r.data),
  accept: (payload) => api.post('/invites/accept', payload).then((r) => r.data),
};




