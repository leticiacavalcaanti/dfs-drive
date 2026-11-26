"use client";
import { useState } from "react";
import { ARQUIVO, ESTADOS, NO, decimal, inteiro, pct, tamanho } from "../lib/formato";

const CELULAS = 100;

function Disco({ no, limite }) {
  const usado = no.used_pct ?? 0;
  const cheias = usado > 0 ? Math.max(1, Math.round(usado)) : 0;
  const corte = Math.round((limite ?? 0.9) * CELULAS);
  return (
    <div className="disco" role="img"
      aria-label={`Disco ${pct(usado)} usado: ${tamanho(no.used)} de ${tamanho(no.total)}. Acima de ${Math.round((limite ?? 0.9) * 100)} % o nó não recebe réplicas novas.`}>
      {Array.from({ length: CELULAS }, (_, i) => (
        <span key={i} className="disco__bloco" data-cheio={i < cheias || undefined} data-reserva={i >= corte || undefined} />
      ))}
    </div>
  );
}

function CartaoNo({ no, limite, saindo, entrando, aoAlternar }) {
  const [ocupado, setOcupado] = useState(false);
  const estado = NO[no.status] ?? { rotulo: no.status, tom: "bad" };
  const alternar = async () => {
    setOcupado(true);
    try { await aoAlternar(no); } finally { setOcupado(false); }
  };
  return (
    <li className="no" data-tom={estado.tom} data-drenando={no.draining || undefined}>
      <Disco no={no} limite={limite} />
      <div className="no__corpo">
        <div className="no__topo">
          <h4 className="no__id">{no.id}</h4>
          <span className="estado" data-tom={no.draining ? "info" : estado.tom}>
            <span className="estado__ponto" aria-hidden="true" />{no.draining ? `${estado.rotulo}, drenando` : estado.rotulo}
          </span>
        </div>
        <p className="no__onde" title={`máquina ${no.machine}, disco ${no.disk}`}>
          {no.machine} · {no.disk} · sinal há {decimal(no.last_heartbeat_s)} s
        </p>
        <p className="no__numeros">
          <b>{pct(no.used_pct)}</b>
          <span>{tamanho(no.used)} de {tamanho(no.total)} · {inteiro(no.chunks)} {no.chunks === 1 ? "bloco" : "blocos"}</span>
        </p>
      </div>
      <button type="button" className="btn btn--secondary no__acao" onClick={alternar} disabled={ocupado}
        aria-label={no.draining ? `Cancelar drenagem de ${no.id}` : `Drenar ${no.id}`}>
        {no.draining ? "Retomar" : "Drenar"}
      </button>
      {(saindo > 0 || entrando > 0) && (
        <p className="no__fluxo">
          {saindo > 0 && <span>enviando {saindo} {saindo === 1 ? "cópia" : "cópias"}</span>}
          {entrando > 0 && <span>recebendo {entrando} {entrando === 1 ? "cópia" : "cópias"}</span>}
        </p>
      )}
    </li>
  );
}

export default function Cluster({ status, metricas, aoAlternarDreno }) {
  const nos = status?.nodes ?? [];
  const contar = (s) => nos.filter((n) => n.status === s).length;
  const emCurso = status?.rereplications_in_progress ?? [];
  const porEstado = status?.files_by_state ?? {};
  const totalArquivos = ESTADOS.reduce((t, s) => t + (porEstado[s] ?? 0), 0);
  const limite = metricas?.config?.disk_limit;
  const fluxo = (id, lado) => emCurso.filter((m) => m[lado] === id).length;

  return (
    <aside className="trilho" aria-labelledby="t-cluster">
      <div className="trilho__cabeca">
        <h2 id="t-cluster">Cluster DFS</h2>
        <p className="trilho__frase">
          {status ? <>{contar("alive")} de {nos.length} nós respondendo</> : "aguardando o controlador"}
        </p>
      </div>

      <dl className="placar">
        <div data-tom="ok"><dt>vivos</dt><dd>{contar("alive")}</dd></div>
        <div data-tom="warn"><dt>suspeitos</dt><dd>{contar("suspect")}</dd></div>
        <div data-tom="bad"><dt>caídos</dt><dd>{contar("dead")}</dd></div>
      </dl>

      <section className="livro" aria-labelledby="t-estados">
        <div className="livro__topo"><h3 id="t-estados">Arquivos por estado</h3><p className="mudo">{inteiro(totalArquivos)} no total</p></div>
        <ul>
          {ESTADOS.map((s) => (
            <li key={s} data-tom={ARQUIVO[s].tom} data-zero={!porEstado[s] || undefined} title={ARQUIVO[s].explica}>
              <span className="estado__ponto" aria-hidden="true" />
              <span>{s}</span>
              <b>{inteiro(porEstado[s])}</b>
            </li>
          ))}
        </ul>
        {metricas && (
          <p className="livro__pe">
            {tamanho(metricas.logical_bytes)} de dados ocupam {tamanho(metricas.physical_bytes)} nos discos
            {metricas.storage_overhead ? ` (${decimal(metricas.storage_overhead)}×)` : ""}
          </p>
        )}
      </section>

      {emCurso.length > 0 && (
        <section className="transito" aria-labelledby="t-transito" aria-live="polite">
          <div className="livro__topo"><h3 id="t-transito">Re-replicação em curso</h3><p className="mudo">{emCurso.length} {emCurso.length === 1 ? "cópia" : "cópias"}</p></div>
          <ul>
            {emCurso.map((m) => (
              <li key={m.chunk}>
                <code>{m.chunk}</code>
                <span className="transito__rota">
                  <b>{m.source}</b><span className="transito__linha" aria-hidden="true" /><span className="sr">para</span><b>{m.target}</b>
                </span>
                <span className="mudo">restavam {m.live_replicas} {m.live_replicas === 1 ? "réplica viva" : "réplicas vivas"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="t-nos">
        <h3 id="t-nos" className="trilho__titulo">Nós do cluster</h3>
        {nos.length === 0
          ? <p className="vazio">Nenhum nó registrado ainda. Os nós aparecem aqui assim que mandam o primeiro sinal.</p>
          : (
            <ul className="nos">
              {nos.map((n) => (
                <CartaoNo key={n.id} no={n} limite={limite} saindo={fluxo(n.id, "source")} entrando={fluxo(n.id, "target")}
                  aoAlternar={aoAlternarDreno} />
              ))}
            </ul>
          )}
      </section>

    </aside>
  );
}
