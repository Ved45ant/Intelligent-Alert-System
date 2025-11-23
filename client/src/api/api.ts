const BASE = import.meta.env.VITE_BACKEND_BASE || "http://localhost:5001";

async function request(path: string, opts: RequestInit = {}) {
  let token = sessionStorage.getItem("token");
  if (token === 'null' || token === 'undefined') {
    token = null;
    sessionStorage.removeItem('token');
  }
  console.log("Making request to:", path, "Token:", token ? token.slice(0, 20) + "..." : "none");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
  });
  if (!res.ok) {
    if (res.status === 401) {
      try {
        sessionStorage.removeItem("token");
        localStorage.removeItem("token");
      } catch (e) {}
      window.location.reload();
    }
    const txt = await res.text();
    throw new Error(`HTTP ${res.status} ${txt}`);
  }
  return res.json().catch(() => null);
}

export async function createTestAlert(payload: any) {
  return request("/api/alerts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchSummary() {
  const res = await request("/api/dashboard/summary");
  return {
    critical: res.counts?.CRITICAL || 0,
    warning: res.counts?.WARNING || 0,
    info: res.counts?.INFO || 0,
    topDrivers: res.topDrivers || [],
  };
}

export async function fetchAutoClosed(hours = 24) {
  const q = new URLSearchParams({ hours: String(hours) });
  return request(`/api/dashboard/auto-closed?${q.toString()}`);
}

export async function fetchTrends(days = 7) {
  const q = new URLSearchParams({ days: String(days) });
  return request(`/api/dashboard/trends?${q.toString()}`);
}

export async function fetchRulesOverview() {
  return request("/api/dashboard/rules");
}

export async function fetchAlerts(
  params: { limit?: number; skip?: number } = {}
) {
  const q = new URLSearchParams();
  if (params.limit) q.set("limit", String(params.limit));
  if (params.skip) q.set("skip", String(params.skip));
  return request(`/api/alerts?${q.toString()}`);
}

export async function fetchAlertById(id: string) {
  return request(`/api/alerts/${encodeURIComponent(id)}`);
}

export async function resolveAlertApi(alertId: string, reason?: string) {
  return request(`/api/alerts/${encodeURIComponent(alertId)}/resolve`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function fetchEvents(
  params: { alertId?: string; type?: string; limit?: number } = {}
) {
  const q = new URLSearchParams();
  if (params.alertId) q.set("alertId", params.alertId);
  if (params.type) q.set("type", params.type);
  if (params.limit) q.set("limit", String(params.limit));
  return request(`/api/events?${q.toString()}`);
}

export async function loginApi(credentials: {
  email?: string;
  username?: string;
  password: string;
}) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function getMe() {
  return request('/api/auth/me');
}

export async function createAdminApi(credentials: {
  email: string;
  username?: string;
  password: string;
}) {
  return request("/api/auth/create-admin", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function fetchEventCounts() {
  return request("/api/events/counts");
}
