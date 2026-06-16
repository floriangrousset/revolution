/* Thin fetch wrappers around the backend. Paths are relative so Vite's
   /api proxy (vite.config.ts) forwards them to the FastAPI server. */

import type {
  Persona,
  PersonaSummary,
  PartyEntry,
  RelationshipGraph,
} from "./types";

class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let detail: { code?: string; message?: string } | undefined;
    try {
      const body = await res.json();
      detail = body?.detail ?? body?.error;
    } catch {
      // not JSON — fall through
    }
    throw new ApiError(detail?.message || res.statusText, res.status, detail?.code);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; model: string }>("/api/health"),

  // personas
  listPersonas: (params?: { party?: string; role?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.party) qs.set("party", params.party);
    if (params?.role) qs.set("role", params.role);
    if (params?.q) qs.set("q", params.q);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<{ personas: PersonaSummary[] }>(`/api/personas${suffix}`);
  },
  getPersona: (id: string) => request<Persona>(`/api/personas/${id}`),
  createPersona: (body: Persona) =>
    request<Persona>("/api/personas", { method: "POST", body: JSON.stringify(body) }),
  updatePersona: (id: string, patch: Partial<Persona>) =>
    request<Persona>(`/api/personas/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deletePersona: (id: string, force = false) =>
    request<void>(`/api/personas/${id}${force ? "?force=true" : ""}`, { method: "DELETE" }),

  // parties
  listParties: () => request<{ parties: PartyEntry[] }>("/api/parties"),
  createParty: (body: { id: string; label: string; color: string }) =>
    request<PartyEntry>("/api/parties", { method: "POST", body: JSON.stringify(body) }),

  // relationships
  getRelationships: () => request<RelationshipGraph>("/api/relationships"),
};

export { ApiError };
