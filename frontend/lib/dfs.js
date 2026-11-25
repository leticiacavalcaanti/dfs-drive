// O navegador só conversa com as rotas /api do Next.js; elas falam com o controlador e com os nós.
async function pedir(url, init) {
  const res = await fetch(url, { cache: "no-store", ...init });
  const texto = await res.text();
  let corpo;
  try { corpo = JSON.parse(texto); } catch { corpo = texto; }
  if (!res.ok) throw new Error(corpo?.detail || `erro ${res.status}`);
  return corpo;
}

const q = (path) => `path=${encodeURIComponent(path)}`;

export const dfs = {
  status: () => pedir("/api/ctl/status"),
  metricas: () => pedir("/api/ctl/metrics"),
  listar: (dir) => pedir(`/api/ctl/dirs?${q(dir)}`),
  detalhes: (path) => pedir(`/api/ctl/files/stat?${q(path)}`),
  criarPasta: (path) => pedir(`/api/ctl/dirs?${q(path)}`, { method: "POST" }),
  removerPasta: (path) => pedir(`/api/ctl/dirs?${q(path)}`, { method: "DELETE" }),
  removerArquivo: (path) => pedir(`/api/ctl/files?${q(path)}`, { method: "DELETE" }),
  drenar: (id) => pedir(`/api/ctl/nodes/${encodeURIComponent(id)}/drain`, { method: "POST" }),
  retomar: (id) => pedir(`/api/ctl/nodes/${encodeURIComponent(id)}/undrain`, { method: "POST" }),

  // XHR em vez de fetch: é o único jeito de acompanhar o progresso do envio no navegador.
  enviar(arquivo, dir, replicas, aoProgredir) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("file", arquivo);
      form.append("dir", dir);
      if (replicas) form.append("replicas", String(replicas));
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) aoProgredir?.(e.loaded / e.total); };
      xhr.upload.onload = () => aoProgredir?.(1);
      xhr.onerror = () => reject(new Error("falha de rede ao enviar"));
      xhr.onload = () => {
        let corpo;
        try { corpo = JSON.parse(xhr.responseText); } catch { corpo = {}; }
        if (xhr.status >= 200 && xhr.status < 300) resolve(corpo);
        else reject(new Error(corpo.detail || `erro ${xhr.status}`));
      };
      xhr.send(form);
    });
  },

  async baixar(path) {
    const res = await fetch(`/api/download?${q(path)}`, { cache: "no-store" });
    if (!res.ok) {
      let detalhe = `erro ${res.status}`;
      try { detalhe = (await res.json()).detail || detalhe; } catch { /* corpo não é JSON */ }
      throw new Error(detalhe);
    }
    const notas = decodeURIComponent(res.headers.get("X-DFS-Notes") || "").split("; ").filter(Boolean);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = path.split("/").pop() || "arquivo";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return { notas, bytes: blob.size };
  },
};
