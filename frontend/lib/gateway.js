// Código de SERVIDOR (rotas /api): faz o papel do cliente CLI para o navegador.
// Os nós só são alcançáveis dentro da rede do Docker, então o navegador nunca fala com eles:
// ele envia/recebe o arquivo para esta camada, que divide em blocos, calcula SHA-256, envia aos nós
// indicados pelo controlador, e na leitura verifica cada bloco e o arquivo inteiro.
import crypto from "node:crypto";

export const CTRL = process.env.CONTROLLER_URL || "http://controller:9000";
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

export async function ctl(path, init = {}) {
  const res = await fetch(CTRL + path, { cache: "no-store", ...init });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, ok: res.ok, body };
}

const json = (method, data) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });

// Envia um arquivo: allocate -> PUT paralelo dos blocos aos nós -> commit (o arquivo só aparece no commit).
export async function putFile({ path, buffer, replicas }) {
  const cfg = await ctl("/config");
  const chunkBytes = Math.max(1, Math.floor((cfg.body.chunk_mb || 4) * 1024 * 1024));
  const payloads = [];
  for (let i = 0; i < Math.max(buffer.length, 1); i += chunkBytes) payloads.push(buffer.subarray(i, i + chunkBytes));
  const specs = payloads.map((p, index) => ({ index, size: p.length, sha256: sha256(p) }));

  const alloc = await ctl("/files/allocate", json("POST", { path, size: buffer.length, sha256: sha256(buffer), chunks: specs, replicas: replicas || null }));
  if (!alloc.ok) throw new Error(alloc.body?.detail || `controlador respondeu ${alloc.status}`);
  const { version, chunk_ids, targets, warnings } = alloc.body;

  const jobs = [];
  for (const [idx, nodes] of Object.entries(targets)) {
    for (const node of nodes) jobs.push({ idx: Number(idx), node });
  }
  const stored = {};
  await Promise.all(jobs.map(async ({ idx, node }) => {
    try {
      const r = await fetch(`${node.url}/chunks/${chunk_ids[idx]}`, {
        method: "PUT", headers: { "X-Sha256": specs[idx].sha256 }, body: payloads[idx],
      });
      const data = r.ok ? await r.json() : null;
      if (data && data.sha256 === specs[idx].sha256) (stored[String(idx)] ||= []).push(node.id);
    } catch { /* nó indisponível: conta como não confirmado; o quórum decide */ }
  }));

  const commit = await ctl("/files/commit", json("POST", { version, stored }));
  if (!commit.ok) throw new Error(commit.body?.detail || `commit falhou (${commit.status})`);
  return { state: commit.body.state, warnings, chunks: payloads.length, bytes: buffer.length };
}

// Lê um arquivo: tenta réplicas vivas primeiro; bloco com hash errado é reportado e substituído por outra réplica.
export async function getFile(path) {
  const stat = await ctl(`/files/stat?path=${encodeURIComponent(path)}`);
  if (!stat.ok) throw new Error(stat.body?.detail || "arquivo não encontrado");
  const meta = stat.body;
  const notes = [];
  const parts = [];
  for (const c of meta.chunks) {
    let blob = null;
    const order = [...c.replicas].sort((a, b) => (a.status !== "alive") - (b.status !== "alive"));
    for (const r of order) {
      if (r.status === "dead" || !r.url) continue;
      try {
        const res = await fetch(`${r.url}/chunks/${c.id}`, { cache: "no-store" });
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        if (sha256(buf) === c.sha256) { blob = buf; break; }
        notes.push(`réplica corrompida do bloco ${c.index} em ${r.node}: usando outra`);
        await ctl("/report-corrupt", json("POST", { chunk_id: c.id, node_id: r.node }));
      } catch { /* tenta a próxima réplica */ }
    }
    if (!blob) throw new Error(`nenhuma réplica íntegra do bloco ${c.index}`);
    parts.push(blob);
  }
  const whole = Buffer.concat(parts);
  if (sha256(whole) !== meta.sha256) throw new Error("hash do arquivo final não confere");
  return { buffer: whole, meta, notes };
}
