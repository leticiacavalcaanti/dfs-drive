"use client";
import { dfs } from "../lib/api";
import { TONE } from "../lib/format";

const LABEL = { alive: "vivo", suspect: "suspeito", dead: "caído" };

export default function NodesPanel({ nodes, onChanged, onError }) {
  const act = async (fn, id) => {
    try { await fn(id); onChanged(); } catch (e) { onError(e.message); }
  };
  if (!nodes.length) return <p className="empty">Nenhum nó registrado ainda.</p>;
  return (
    <div className="nodes">
      {nodes.map((n) => {
        const pct = n.used_pct ?? 0;
        return (
          <article key={n.id} className={`node ${TONE[n.status]}`}>
            <header>
              <strong>{n.id}</strong>
              <span className={`pill ${TONE[n.status]}`}>{LABEL[n.status] ?? n.status}</span>
            </header>
            <p className="muted">máquina {n.machine} · disco {n.disk}</p>
            <div className="bar" role="img" aria-label={`${pct}% do disco usado`}>
              <span style={{ width: `${Math.min(pct, 100)}%` }} className={pct > 90 ? "bad" : ""} />
            </div>
            <p className="small">{pct}% usado · {n.chunks} bloco(s)</p>
            {n.draining && <p className="small warn-text">drenando: blocos sendo movidos para outros nós</p>}
            <footer>
              {n.draining
                ? <button className="ghost" onClick={() => act(dfs.undrain, n.id)}>Cancelar drain</button>
                : <button className="ghost" onClick={() => act(dfs.drain, n.id)}>Esvaziar (drain)</button>}
            </footer>
          </article>
        );
      })}
    </div>
  );
}
