// Chamadas do navegador. Tudo passa pelas rotas /api do próprio Next.js (nunca direto ao controlador ou aos nós).
async function request(url, init) {
  const res = await fetch(url, { cache: "no-store", ...init });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) throw new Error(body?.detail || `erro ${res.status}`);
  return body;
}

const post = (url, data) => request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
const q = (path) => `path=${encodeURIComponent(path)}`;

export const dfs = {
  status: () => request("/api/ctl/status"),
  metrics: () => request("/api/ctl/metrics"),
  list: (path) => request(`/api/ctl/dirs?${q(path)}`),
  stat: (path) => request(`/api/ctl/files/stat?${q(path)}`),
  mkdir: (path) => request(`/api/ctl/dirs?${q(path)}`, { method: "POST" }),
  rmdir: (path) => request(`/api/ctl/dirs?${q(path)}`, { method: "DELETE" }),
  remove: (path) => request(`/api/ctl/files?${q(path)}`, { method: "DELETE" }),
  move: (src, dst) => post("/api/ctl/files/move", { src, dst }),
  drain: (id) => request(`/api/ctl/nodes/${id}/drain`, { method: "POST" }),
  undrain: (id) => request(`/api/ctl/nodes/${id}/undrain`, { method: "POST" }),
  upload: (file, dir, replicas) => {
    const form = new FormData();
    form.append("file", file);
    form.append("dir", dir);
    if (replicas) form.append("replicas", String(replicas));
    return request("/api/upload", { method: "POST", body: form });
  },
  downloadUrl: (path) => `/api/download?${q(path)}`,
};
