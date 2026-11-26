"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { dfs } from "../lib/dfs";
import { decimal, relogio, tamanho } from "../lib/formato";
import Cluster from "../ui/Cluster";
import Explorador from "../ui/Explorador";
import Detalhes from "../ui/Detalhes";
import Glifo from "../ui/Glifo";

let proximoEvento = 1;

function Diario({ eventos, limpar }) {
  const [aberto, setAberto] = useState(false);
  const ultimo = eventos[0];
  return (
    <footer className="barra">
      <p className="barra__ultimo" role="status" aria-live="polite">
        {ultimo
          ? <><span className="estado__ponto" data-tom={ultimo.tom} aria-hidden="true" /><time>{relogio(ultimo.quando)}</time><span>{ultimo.texto}</span></>
          : <span className="mudo">Nenhuma operação nesta sessão ainda.</span>}
      </p>
      <button type="button" className="btn btn--secondary" aria-expanded={aberto} aria-controls="diario"
        onClick={() => setAberto((a) => !a)} disabled={!eventos.length}>
        <Glifo nome="diario" />Diário ({eventos.length})
      </button>
      {aberto && eventos.length > 0 && (
        <div className="diario" id="diario">
          <div className="diario__topo">
            <h2>Diário da sessão</h2>
            <button type="button" className="link" onClick={() => { limpar(); setAberto(false); }}>Limpar diário</button>
          </div>
          <ol>
            {eventos.map((e) => (
              <li key={e.id}>
                <span className="estado__ponto" data-tom={e.tom} aria-hidden="true" />
                <time>{relogio(e.quando)}</time>
                <span>{e.texto}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </footer>
  );
}

export default function Painel() {
  const [status, setStatus] = useState(null);
  const [metricas, setMetricas] = useState(null);
  const [offline, setOffline] = useState(false);
  const [lidoEm, setLidoEm] = useState(null);
  const [dir, setDir] = useState("/");
  const [alvo, setAlvo] = useState(null);
  const [itens, setItens] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [versao, setVersao] = useState(0);
  const tentativas = useRef(0);

  const anotar = useCallback((tipo, texto) => {
    const tom = { ok: "ok", aviso: "warn", erro: "bad" }[tipo] ?? "info";
    setEventos((l) => [{ id: proximoEvento++, tom, texto, quando: Date.now() }, ...l].slice(0, 60));
  }, []);

  const lerStatus = useCallback(async () => {
    try {
      setStatus(await dfs.status());
      setOffline(false);
      setLidoEm(Date.now());
      tentativas.current = 0;
    } catch {
      tentativas.current += 1;
      setOffline(true);
    }
  }, []);

  const lerMetricas = useCallback(async () => {
    try { setMetricas(await dfs.metricas()); } catch { /* o status já mostra a queda */ }
  }, []);

  useEffect(() => {
    lerStatus();
    lerMetricas();
    const a = setInterval(lerStatus, 2000);
    const b = setInterval(lerMetricas, 5000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [lerStatus, lerMetricas]);

  const irPara = useCallback((d) => { setDir(d); setAlvo(null); }, []);
  const aoMudar = useCallback(() => { lerStatus(); lerMetricas(); }, [lerStatus, lerMetricas]);

  const baixar = useCallback(async (path) => {
    try {
      const { notas, bytes } = await dfs.baixar(path);
      anotar(notas.length ? "aviso" : "ok", `${path} baixado (${tamanho(bytes)}), hash de cada bloco e do arquivo conferido`
        + (notas.length ? `. ${notas.join("; ")}` : ""));
    } catch (e) {
      anotar("erro", `${path} não foi baixado: ${e.message}`);
    }
  }, [anotar]);

  const removerArquivo = useCallback(async (path) => {
    try {
      await dfs.removerArquivo(path);
      anotar("ok", `${path} removido`);
      setAlvo(null);
      setVersao((v) => v + 1);
      aoMudar();
    } catch (e) {
      anotar("erro", `${path} não foi removido: ${e.message}`);
    }
  }, [anotar, aoMudar]);

  const alternarDreno = useCallback(async (no) => {
    try {
      if (no.draining) { await dfs.retomar(no.id); anotar("ok", `${no.id} voltou a receber réplicas`); }
      else { await dfs.drenar(no.id); anotar("aviso", `${no.id} em drenagem: os blocos dele serão copiados para outros nós`); }
      await lerStatus();
    } catch (e) {
      anotar("erro", `não foi possível mudar a drenagem de ${no.id}: ${e.message}`);
    }
  }, [anotar, lerStatus]);

  const nos = status?.nodes ?? [];
  const cfg = metricas?.config;

  return (
    <div className="casca">
      <header className="topo">
        <a className="pular" href="#t-arquivos">Pular para os arquivos</a>
        <div className="marca">
          <span className="marca__arco" aria-hidden="true" />
          <h1>DFS</h1>
          <p className="marca__sub">sistema de arquivos distribuído</p>
        </div>
        <p className="conexao" data-tom={offline ? "bad" : status ? "ok" : "info"} role="status">
          <span className="estado__ponto" aria-hidden="true" />
          {offline
            ? `Sem resposta do controlador, tentando de novo (${tentativas.current})`
            : status ? <>Controlador respondendo <span className="mudo">· lido às {relogio(lidoEm)}</span></> : "Conectando ao controlador…"}
        </p>
        {cfg && (
          <dl className="config" aria-label="Configuração do controlador">
            <div title="nível de replicação padrão"><dt>N</dt><dd>{cfg.N}</dd></div>
            <div title="réplicas confirmadas antes de responder"><dt>W</dt><dd>{cfg.W}</dd></div>
            <div title="disco acima disso não recebe réplicas novas"><dt>limite</dt><dd>{decimal(cfg.disk_limit * 100)} %</dd></div>
            <div title="nó vira suspeito / caído após esse tempo sem sinal"><dt>sinal</dt><dd>{decimal(cfg.heartbeat_suspect_s)}/{decimal(cfg.heartbeat_dead_s)} s</dd></div>
          </dl>
        )}
      </header>

      <div className="mesa" data-entra>
        <Cluster status={status} metricas={metricas} aoAlternarDreno={alternarDreno} />
        <main className="folha">
          <Explorador dir={dir} irPara={irPara} selecionado={alvo} selecionar={setAlvo}
            padraoN={cfg?.N} maxN={nos.length} anotar={anotar} aoMudar={aoMudar} aoListar={setItens}
            baixar={baixar} versao={versao} />
          <Detalhes alvo={alvo} dir={dir} itens={itens} nos={nos} fechar={() => setAlvo(null)}
            baixar={baixar} remover={removerArquivo} />
          <Diario eventos={eventos} limpar={() => setEventos([])} />
        </main>
      </div>
    </div>
  );
}
