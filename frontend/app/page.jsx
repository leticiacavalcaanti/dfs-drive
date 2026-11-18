"use client";
import { useCallback, useEffect, useState } from "react";
import { dfs } from "../lib/api";
import { TONE } from "../lib/format";
import NodesPanel from "../components/NodesPanel";
import FilesPanel from "../components/FilesPanel";

const STATES = ["íntegro", "sub-replicado", "em recuperação", "perdido"];

export default function Home() {
  const [status, setStatus] = useState(null);
  const [offline, setOffline] = useState(false);
  const [notice, setNotice] = useState(null); // { kind: "ok" | "err", text }

  const load = useCallback(async () => {
    try { setStatus(await dfs.status()); setOffline(false); } catch { setOffline(true); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [load]);

  const say = useCallback((kind) => (text) => setNotice({ kind, text }), []);
  const onNotice = useCallback(say("ok"), [say]);
  const onError = useCallback(say("err"), [say]);

  const nodes = status?.nodes ?? [];
  const count = (s) => nodes.filter((n) => n.status === s).length;
  const moving = status?.rereplications_in_progress ?? [];

  return (
    <main>
      <header className="top">
        <div>
          <p className="eyebrow">Sistemas Distribuídos · UFS</p>
          <h1>DFS Console</h1>
        </div>
        <div className={`conn ${offline ? "bad" : "ok"}`} role="status">
          {offline ? "controlador indisponível: tentando de novo…" : "conectado ao controlador"}
        </div>
      </header>

      {notice && (
        <div className={`notice ${notice.kind}`} role="alert">
          <span>{notice.text}</span>
          <button className="ghost" onClick={() => setNotice(null)}>Fechar</button>
        </div>
      )}

      <section aria-label="Resumo" className="summary">
        <div className="tile"><b className="ok-text">{count("alive")}</b><span>nós vivos</span></div>
        <div className="tile"><b className="warn-text">{count("suspect")}</b><span>suspeitos</span></div>
        <div className="tile"><b className="bad-text">{count("dead")}</b><span>caídos</span></div>
        {STATES.map((s) => (
          <div className="tile" key={s}><b>{status?.files_by_state?.[s] ?? 0}</b><span className={`pill ${TONE[s]}`}>{s}</span></div>
        ))}
      </section>

      {moving.length > 0 && (
        <section className="moving" aria-label="Re-replicações em andamento">
          <h2>Recuperação em andamento</h2>
          <ul>
            {moving.map((m) => (
              <li key={m.chunk}><code>{m.chunk}</code> copiando de <strong>{m.source}</strong> para <strong>{m.target}</strong> (restavam {m.live_replicas} cópia(s) viva(s))</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="h-nodes">
        <h2 id="h-nodes">Nós de armazenamento</h2>
        <NodesPanel nodes={nodes} onChanged={load} onError={onError} />
      </section>

      <section aria-labelledby="h-files">
        <h2 id="h-files">Arquivos</h2>
        <FilesPanel onNotice={onNotice} onError={onError} />
      </section>
    </main>
  );
}
