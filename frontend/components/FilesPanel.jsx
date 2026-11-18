"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { dfs } from "../lib/api";
import { TONE, bytes, join, parent, when } from "../lib/format";

export default function FilesPanel({ onNotice, onError }) {
  const [dir, setDir] = useState("/");
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(null); // metadados do arquivo aberto
  const [busy, setBusy] = useState(false);
  const [newDir, setNewDir] = useState("");
  const [replicas, setReplicas] = useState("");
  const fileInput = useRef(null);

  const refresh = useCallback(async () => {
    try { setEntries(await dfs.list(dir)); } catch (e) { onError(e.message); setEntries([]); }
  }, [dir, onError]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  // mantém o painel de detalhes atualizado (réplicas mudam durante falhas)
  useEffect(() => {
    if (!selected) return undefined;
    const t = setInterval(async () => {
      try { setSelected(await dfs.stat(selected.path)); } catch { setSelected(null); }
    }, 2000);
    return () => clearInterval(t);
  }, [selected?.path]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn, okMessage) => {
    setBusy(true);
    try { const r = await fn(); if (okMessage) onNotice(okMessage(r)); await refresh(); }
    catch (e) { onError(e.message); }
    finally { setBusy(false); }
  };

  const upload = (ev) => {
    ev.preventDefault();
    const file = fileInput.current?.files?.[0];
    if (!file) return onError("escolha um arquivo");
    run(() => dfs.upload(file, dir, Number(replicas) || null), (r) =>
      `${r.path} enviado: ${r.chunks} bloco(s), estado ${r.state}` + (r.warnings?.length ? `. AVISO: ${r.warnings.join("; ")}` : ""));
    fileInput.current.value = "";
  };

  return (
    <div className="files">
      <div className="crumbs">
        <button className="ghost" disabled={dir === "/"} onClick={() => { setDir(parent(dir)); setSelected(null); }}>← subir</button>
        <code>{dir}</code>
      </div>

      <div className="toolbar">
        <form onSubmit={upload} className="inline">
          <input ref={fileInput} type="file" aria-label="Arquivo para enviar" />
          <label className="small muted">cópias (N)
            <select value={replicas} onChange={(e) => setReplicas(e.target.value)}>
              <option value="">padrão</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button disabled={busy}>{busy ? "Enviando…" : "Enviar arquivo"}</button>
        </form>
        <form className="inline" onSubmit={(e) => { e.preventDefault(); if (!newDir.trim()) return; run(() => dfs.mkdir(join(dir, newDir.trim())), () => `pasta ${newDir.trim()} criada`); setNewDir(""); }}>
          <input value={newDir} onChange={(e) => setNewDir(e.target.value)} placeholder="nova pasta" aria-label="Nome da nova pasta" />
          <button className="ghost" disabled={busy}>Criar pasta</button>
        </form>
      </div>

      {entries.length === 0 ? <p className="empty">Pasta vazia.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th className="num">Tamanho</th><th>Estado</th><th>Modificado</th><th aria-label="Ações" /></tr></thead>
            <tbody>
              {entries.map((e) => {
                const path = join(dir, e.name);
                return (
                  <tr key={e.name}>
                    <td>
                      {e.type === "dir"
                        ? <button className="link" onClick={() => { setDir(path); setSelected(null); }}>📁 {e.name}</button>
                        : <button className="link" onClick={async () => { try { setSelected(await dfs.stat(path)); } catch (x) { onError(x.message); } }}>{e.name}</button>}
                    </td>
                    <td className="num">{e.type === "file" ? bytes(e.size) : ""}</td>
                    <td>{e.state && <span className={`pill ${TONE[e.state]}`}>{e.state}</span>}</td>
                    <td className="small muted">{when(e.mtime)}</td>
                    <td className="actions">
                      {e.type === "file" && <a className="btn ghost" href={dfs.downloadUrl(path)}>Baixar</a>}
                      <button className="ghost danger" disabled={busy} onClick={() => run(() => (e.type === "file" ? dfs.remove(path) : dfs.rmdir(path)), () => `${e.name} removido`)}>Remover</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <section className="detail" aria-label="Detalhes do arquivo">
          <header>
            <h3>{selected.path}</h3>
            <button className="ghost" onClick={() => setSelected(null)}>Fechar</button>
          </header>
          <p className="small">
            <span className={`pill ${TONE[selected.state]}`}>{selected.state}</span>{" "}
            {bytes(selected.size)} · N={selected.replicas} · {when(selected.mtime)}
          </p>
          <p className="small muted">SHA-256 <code>{selected.sha256}</code></p>
          <ul className="chunks">
            {selected.chunks.map((c) => (
              <li key={c.id}>
                <span className="mono">bloco {c.index}</span>
                <span className="small muted">{bytes(c.size)} · {c.live_replicas}/{selected.replicas} vivas</span>
                <span className="reps">
                  {c.replicas.map((r) => <span key={r.node} className={`pill ${TONE[r.status]}`}>{r.node}</span>)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
