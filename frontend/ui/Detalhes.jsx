"use client";
import { useEffect, useState } from "react";
import { dfs } from "../lib/dfs";
import { ARQUIVO, ESTADOS, NO, dataHora, inteiro, tamanho } from "../lib/formato";
import Glifo from "./Glifo";

function Hash({ valor }) {
  const [copiado, setCopiado] = useState(false);
  const grupos = valor.match(/.{1,8}/g) ?? [];
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
    } catch {
      const t = document.createElement("textarea");
      t.value = valor;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };
  return (
    <div className="hash">
      <div className="hash__topo">
        <h3>SHA-256 do arquivo</h3>
        <button type="button" className="btn btn--secondary" onClick={copiar}>
          <Glifo nome={copiado ? "check" : "copiar"} />{copiado ? "Hash copiado" : "Copiar hash"}
        </button>
      </div>
      <p className="hash__valor" aria-label={valor}>
        {grupos.map((g, i) => <span key={i}>{g}</span>)}
      </p>
    </div>
  );
}

function MapaReplicas({ meta, nos }) {
  const ids = [...new Set([...nos.map((n) => n.id), ...meta.chunks.flatMap((c) => c.replicas.map((r) => r.node))])].sort();
  return (
    <div className="mapa">
      <div className="mapa__topo">
        <h3>Onde estão os blocos</h3>
        <p className="mudo">{meta.chunks.length} {meta.chunks.length === 1 ? "bloco" : "blocos"} × {ids.length} nós</p>
      </div>
      <div className="mapa__rolagem">
        <table className="mapa__tabela">
          <caption className="sr">Réplicas de cada bloco por nó</caption>
          <thead>
            <tr>
              <th scope="col">Bloco</th>
              {ids.map((id) => {
                const no = nos.find((n) => n.id === id);
                return <th key={id} scope="col" data-tom={NO[no?.status]?.tom ?? "bad"}>{id.replace(/^node/, "n")}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {meta.chunks.map((c) => {
              const tom = c.live_replicas === 0 ? "bad" : c.live_replicas < meta.replicas ? "warn" : "ok";
              return (
                <tr key={c.id}>
                  <th scope="row" title={`sha-256 ${c.sha256}`}>
                    <span className="mapa__indice">#{c.index}</span>
                    <span className="mapa__vivas" data-tom={tom}>{c.live_replicas}/{meta.replicas}</span>
                    <span className="mapa__tam">{tamanho(c.size)}</span>
                  </th>
                  {ids.map((id) => {
                    const r = c.replicas.find((x) => x.node === id);
                    const tomNo = r ? (NO[r.status]?.tom ?? "bad") : null;
                    return (
                      <td key={id}>
                        <span className="celula" data-tom={tomNo ?? undefined} data-vazia={!r || undefined}
                          title={r ? `réplica em ${id} (${NO[r.status]?.rotulo ?? r.status})` : `sem réplica em ${id}`}>
                          <span className="sr">{r ? `réplica em ${id}, nó ${NO[r.status]?.rotulo ?? r.status}` : `sem réplica em ${id}`}</span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="mapa__legenda">
        <li><span className="celula" data-tom="ok" />réplica em nó vivo</li>
        <li><span className="celula" data-tom="warn" />nó suspeito</li>
        <li><span className="celula" data-tom="bad" />nó caído</li>
        <li><span className="celula" data-vazia />sem réplica</li>
      </ul>
    </div>
  );
}

function ResumoPasta({ dir, itens }) {
  const arquivos = (itens ?? []).filter((i) => i.type === "file");
  const pastas = (itens ?? []).length - arquivos.length;
  const total = arquivos.reduce((t, a) => t + (a.size ?? 0), 0);
  return (
    <div className="detalhes__repouso">
      <h2 id="t-detalhes">Detalhes</h2>
      <p className="detalhes__pasta"><code>{dir}</code></p>
      <dl className="fatos">
        <div><dt>Pastas</dt><dd>{inteiro(pastas)}</dd></div>
        <div><dt>Arquivos</dt><dd>{inteiro(arquivos.length)}</dd></div>
        <div><dt>Tamanho somado</dt><dd>{tamanho(total)}</dd></div>
      </dl>
      {arquivos.length > 0 && (
        <ul className="detalhes__estados">
          {ESTADOS.map((s) => {
            const n = arquivos.filter((a) => a.state === s).length;
            return n ? <li key={s}><span className="estado" data-tom={ARQUIVO[s].tom}><span className="estado__ponto" aria-hidden="true" />{s}</span><b>{n}</b></li> : null;
          })}
        </ul>
      )}
      <p className="detalhes__dica">Escolha um arquivo na lista para ver o hash SHA-256, o nível de replicação e em quais nós está cada bloco.</p>
    </div>
  );
}

export default function Detalhes({ alvo, dir, itens, nos, fechar, baixar, remover }) {
  const [meta, setMeta] = useState(null);
  const [erro, setErro] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    setMeta(null);
    setErro(null);
    setConfirmando(false);
    if (!alvo) return undefined;
    let vivo = true;
    const ler = async () => {
      try { const m = await dfs.detalhes(alvo); if (vivo) { setMeta(m); setErro(null); } }
      catch (e) { if (vivo) setErro(e.message); }
    };
    ler();
    const t = setInterval(ler, 2000);
    return () => { vivo = false; clearInterval(t); };
  }, [alvo]);

  useEffect(() => {
    if (!confirmando) return undefined;
    const t = setTimeout(() => setConfirmando(false), 4000);
    return () => clearTimeout(t);
  }, [confirmando]);

  if (!alvo) {
    return <section className="detalhes" aria-labelledby="t-detalhes"><ResumoPasta dir={dir} itens={itens} /></section>;
  }

  const nome = alvo.split("/").pop();
  const info = meta && ARQUIVO[meta.state];

  return (
    <section className="detalhes" aria-labelledby="t-detalhes" data-entra>
      <div className="detalhes__cabeca">
        <div>
          <h2 id="t-detalhes" className="detalhes__nome">{nome}</h2>
          <p className="detalhes__caminho"><code>{alvo}</code></p>
        </div>
        <button type="button" className="acao" onClick={fechar} aria-label="Fechar detalhes"><Glifo nome="fechar" /></button>
      </div>

      {erro && !meta && <p className="lista__erro">{erro}</p>}
      {!meta && !erro && <p className="vazio">Lendo metadados…</p>}

      {meta && (
        <>
          <p className="detalhes__estado">
            <span className="estado estado--grande" data-tom={info?.tom}><span className="estado__ponto" aria-hidden="true" />{meta.state}</span>
            <span className="mudo">{info?.explica}</span>
          </p>

          <div className="detalhes__acoes">
            <button type="button" className="btn btn--primary" disabled={baixando}
              onClick={async () => { setBaixando(true); try { await baixar(alvo); } finally { setBaixando(false); } }}>
              <Glifo nome="baixar" />{baixando ? "Baixando e conferindo…" : "Baixar arquivo"}
            </button>
            {confirmando
              ? <button type="button" className="btn btn--perigo" onClick={() => remover(alvo)}>Confirmar remoção</button>
              : <button type="button" className="btn btn--secondary" onClick={() => setConfirmando(true)}><Glifo nome="remover" />Remover arquivo</button>}
          </div>

          <dl className="fatos">
            <div><dt>Tamanho</dt><dd>{tamanho(meta.size)}</dd></div>
            <div><dt>Réplicas (N)</dt><dd>{meta.replicas}</dd></div>
            <div><dt>Blocos</dt><dd>{meta.chunks.length}</dd></div>
            <div><dt>Versão</dt><dd className="mono">{meta.version}</dd></div>
            <div className="fatos__largo"><dt>Gravado</dt><dd>{dataHora(meta.mtime)}</dd></div>
          </dl>

          <Hash valor={meta.sha256} />
          <MapaReplicas meta={meta} nos={nos} />

        </>
      )}
    </section>
  );
}
