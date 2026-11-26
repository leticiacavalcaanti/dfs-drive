"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { dfs } from "../lib/dfs";
import { ARQUIVO, caminho, dataHora, tamanho, trechos } from "../lib/formato";
import Glifo from "./Glifo";

let proximaId = 1;

function Trilha({ dir, irPara }) {
  const partes = trechos(dir);
  return (
    <nav className="trilha" aria-label="Pasta atual">
      <ol>
        <li>
          <button type="button" className="trilha__passo" onClick={() => irPara("/")} aria-current={dir === "/" ? "page" : undefined}>
            raiz
          </button>
        </li>
        {partes.map((p, i) => (
          <li key={p.caminho}>
            <span className="trilha__barra" aria-hidden="true">/</span>
            <button type="button" className="trilha__passo" onClick={() => irPara(p.caminho)}
              aria-current={i === partes.length - 1 ? "page" : undefined}>
              {p.nome}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function SeletorReplicas({ valor, padrao, maximo, mudar }) {
  const opcoes = [null, ...Array.from({ length: maximo }, (_, i) => i + 1)];
  return (
    <fieldset className="replicas">
      <legend>Réplicas por bloco</legend>
      <div className="replicas__opcoes">
        {opcoes.map((n) => (
          <label key={n ?? "padrao"} className="replicas__opcao">
            <input type="radio" name="replicas" checked={valor === n} onChange={() => mudar(n)} />
            <span>{n == null ? `padrão (${padrao ?? "?"})` : n}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Remover({ rotulo, aoConfirmar }) {
  const [pedindo, setPedindo] = useState(false);
  useEffect(() => {
    if (!pedindo) return undefined;
    const t = setTimeout(() => setPedindo(false), 4000);
    return () => clearTimeout(t);
  }, [pedindo]);
  if (pedindo) {
    return (
      <>
        <span className="acao acao--vaga" aria-hidden="true"><Glifo nome="remover" /></span>
        <button type="button" className="acao acao--perigo acao--confirmar" aria-label={`Confirmar remoção de ${rotulo}`}
          onClick={() => { setPedindo(false); aoConfirmar(); }} autoFocus>
          Confirmar remoção
        </button>
      </>
    );
  }
  return (
    <button type="button" className="acao" aria-label={`Remover ${rotulo}`} title="Remover" onClick={() => setPedindo(true)}>
      <Glifo nome="remover" />
    </button>
  );
}

export default function Explorador({ dir, irPara, selecionado, selecionar, padraoN, maxN, anotar, aoMudar, aoListar, baixar, versao }) {
  const [itens, setItens] = useState(null);
  const [erro, setErro] = useState(null);
  const [replicas, setReplicas] = useState(null);
  const [fila, setFila] = useState([]);
  const [criando, setCriando] = useState(false);
  const [nomePasta, setNomePasta] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const [baixando, setBaixando] = useState(null);
  const entrada = useRef(null);
  const campoPasta = useRef(null);
  const profundidade = useRef(0);

  const recarregar = useCallback(async () => {
    try {
      const lista = await dfs.listar(dir);
      setItens(lista);
      setErro(null);
      aoListar?.(lista);
    } catch (e) {
      setErro(e.message);
      setItens([]);
      aoListar?.([]);
    }
  }, [dir, aoListar]);

  useEffect(() => {
    setItens(null);
    recarregar();
    const t = setInterval(recarregar, 3000);
    return () => clearInterval(t);
  }, [recarregar]);

  useEffect(() => { if (versao) recarregar(); }, [versao]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (criando) campoPasta.current?.focus(); }, [criando]);

  const atualizarItem = (id, mudanca) => setFila((f) => f.map((x) => (x.id === id ? { ...x, ...mudanca } : x)));

  const enviar = async (arquivos) => {
    const destino = dir;
    const n = replicas;
    const novos = [...arquivos].map((a) => ({ id: proximaId++, arquivo: a, nome: a.name, tamanho: a.size, progresso: 0, fase: "na fila" }));
    if (!novos.length) return;
    setFila((f) => [...novos, ...f]);
    for (const item of novos) {
      atualizarItem(item.id, { fase: "subindo" });
      try {
        const r = await dfs.enviar(item.arquivo, destino, n, (p) =>
          atualizarItem(item.id, { progresso: p, fase: p >= 1 ? "gravando nos nós" : "subindo" }));
        atualizarItem(item.id, { fase: "pronto", progresso: 1, estado: r.state, blocos: r.chunks });
        anotar(r.warnings?.length ? "aviso" : "ok",
          `${r.path} gravado em ${r.chunks} ${r.chunks === 1 ? "bloco" : "blocos"}, estado ${r.state}`
          + (r.warnings?.length ? `. Aviso: ${r.warnings.join("; ")}` : ""));
        aoMudar();
      } catch (e) {
        atualizarItem(item.id, { fase: "falhou", erro: e.message });
        anotar("erro", `${item.nome} não foi gravado: ${e.message}`);
      }
      await recarregar();
      setTimeout(() => setFila((f) => f.filter((x) => x.id !== item.id || x.fase === "falhou")), 6000);
    }
  };

  const criarPasta = async (ev) => {
    ev.preventDefault();
    const nome = nomePasta.trim().replace(/\//g, "-");
    if (!nome) { campoPasta.current?.focus(); return; }
    try {
      await dfs.criarPasta(caminho(dir, nome));
      anotar("ok", `pasta ${caminho(dir, nome)} criada`);
      setNomePasta("");
      setCriando(false);
      await recarregar();
    } catch (e) {
      anotar("erro", `não foi possível criar ${nome}: ${e.message}`);
    }
  };

  const remover = async (item) => {
    const alvo = caminho(dir, item.name);
    try {
      if (item.type === "dir") await dfs.removerPasta(alvo); else await dfs.removerArquivo(alvo);
      anotar("ok", `${alvo} removido`);
      if (selecionado === alvo) selecionar(null);
      await recarregar();
      aoMudar();
    } catch (e) {
      anotar("erro", `${alvo} não foi removido: ${e.message}`);
    }
  };

  const baixarItem = async (alvo) => {
    setBaixando(alvo);
    try { await baixar(alvo); } finally { setBaixando(null); }
  };

  const soltar = {
    onDragEnter: (e) => { if ([...e.dataTransfer.types].includes("Files")) { profundidade.current += 1; setArrastando(true); } },
    onDragLeave: () => { profundidade.current = Math.max(0, profundidade.current - 1); if (!profundidade.current) setArrastando(false); },
    onDragOver: (e) => { if (arrastando) e.preventDefault(); },
    onDrop: (e) => {
      e.preventDefault();
      profundidade.current = 0;
      setArrastando(false);
      enviar(e.dataTransfer.files);
    },
  };

  const pastas = itens?.filter((i) => i.type === "dir").length ?? 0;
  const arquivos = itens ? itens.length - pastas : 0;

  return (
    <section className="explorador" aria-labelledby="t-arquivos" {...soltar} data-arrastando={arrastando || undefined}>
      <div className="explorador__cabeca">
        <div className="explorador__titulo">
          <h2 id="t-arquivos">Arquivos</h2>
          <Trilha dir={dir} irPara={irPara} />
        </div>
        <div className="explorador__acoes">
          <button type="button" className="btn btn--secondary" onClick={() => setCriando((c) => !c)} aria-expanded={criando}>
            <Glifo nome="mais" />Criar pasta
          </button>
          <button type="button" className="btn btn--primary" onClick={() => entrada.current?.click()}>
            <Glifo nome="enviar" />Enviar arquivos
          </button>
          <input ref={entrada} type="file" multiple hidden onChange={(e) => { enviar(e.target.files); e.target.value = ""; }} />
        </div>
      </div>

      <div className="explorador__opcoes">
        <SeletorReplicas valor={replicas} padrao={padraoN} maximo={Math.max(5, maxN || 0)} mudar={setReplicas} />
        <p className="explorador__dica">
          {replicas == null ? `Cada bloco vai para ${padraoN ?? "N"} nós distintos (padrão do controlador)` : `Cada bloco vai para ${replicas} ${replicas === 1 ? "nó" : "nós distintos"}`}
        </p>
      </div>

      {criando && (
        <form className="nova-pasta" onSubmit={criarPasta}>
          <label htmlFor="nome-pasta">Nome da nova pasta em <code>{dir}</code></label>
          <div className="nova-pasta__linha">
            <input id="nome-pasta" ref={campoPasta} value={nomePasta} onChange={(e) => setNomePasta(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setCriando(false); }} autoComplete="off" spellCheck="false" />
            <button type="submit" className="btn btn--primary">Criar pasta</button>
            <button type="button" className="btn btn--secondary" onClick={() => setCriando(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {fila.length > 0 && (
        <ul className="fila" aria-label="Envios" aria-live="polite">
          {fila.map((f) => (
            <li key={f.id} data-fase={f.fase}>
              <Glifo nome={f.fase === "pronto" ? "check" : "enviar"} />
              <span className="fila__nome">{f.nome}</span>
              <span className="fila__fase">
                {f.fase === "subindo" ? `subindo ${Math.round(f.progresso * 100)} %` : f.fase === "pronto" ? `${f.estado}, ${f.blocos} ${f.blocos === 1 ? "bloco" : "blocos"}` : f.fase === "falhou" ? f.erro : f.fase}
              </span>
              <span className="fila__barra" aria-hidden="true"><span style={{ transform: `scaleX(${f.progresso})` }} /></span>
              {f.fase === "falhou" && (
                <button type="button" className="acao" aria-label={`Dispensar ${f.nome}`} onClick={() => setFila((l) => l.filter((x) => x.id !== f.id))}>
                  <Glifo nome="fechar" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="lista" role="region" aria-label={`Conteúdo de ${dir}`}>
        {erro && <p className="lista__erro">{erro === "diretório não encontrado" ? `A pasta ${dir} não existe mais.` : erro}{" "}
          <button type="button" className="link" onClick={() => irPara("/")}>Voltar para a raiz</button></p>}
        {itens == null && <p className="vazio">Lendo {dir}…</p>}
        {itens?.length === 0 && !erro && (
          <div className="vazio vazio--pasta">
            <p>{dir === "/" ? "O sistema de arquivos está vazio." : "Esta pasta está vazia."}</p>
            <p>Envie um arquivo ou crie uma pasta para começar.</p>
          </div>
        )}
        {itens?.length > 0 && (
          <table>
            <caption className="sr">{pastas} {pastas === 1 ? "pasta" : "pastas"} e {arquivos} {arquivos === 1 ? "arquivo" : "arquivos"} em {dir}</caption>
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Estado</th>
                <th scope="col" className="num">Tamanho</th>
                <th scope="col" className="col-data">Modificado</th>
                <th scope="col"><span className="sr">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {dir !== "/" && (
                <tr className="linha linha--subir">
                  <td colSpan={5}>
                    <button type="button" className="linha__nome" onClick={() => irPara(trechos(dir).slice(-2, -1)[0]?.caminho ?? "/")}>
                      <Glifo nome="subir" /><span>voltar uma pasta</span>
                    </button>
                  </td>
                </tr>
              )}
              {itens.map((i) => {
                const alvo = caminho(dir, i.name);
                const ehPasta = i.type === "dir";
                return (
                  <tr key={i.name} className="linha" data-aberto={selecionado === alvo || undefined}>
                    <td>
                      <button type="button" className="linha__nome" onClick={() => (ehPasta ? irPara(alvo) : selecionar(alvo))}>
                        <Glifo nome={ehPasta ? "pasta" : "arquivo"} />
                        <span>{i.name}</span>
                        {!ehPasta && <span className="linha__tam-movel">{tamanho(i.size)}</span>}
                      </button>
                    </td>
                    <td>{i.state && <span className="estado" data-tom={ARQUIVO[i.state]?.tom}><span className="estado__ponto" aria-hidden="true" />{i.state}</span>}</td>
                    <td className="num">{ehPasta ? <span className="mudo">pasta</span> : tamanho(i.size)}</td>
                    <td className="col-data mudo">{dataHora(i.mtime)}</td>
                    <td className="linha__acoes">
                      {!ehPasta && (
                        <button type="button" className="acao" aria-label={`Baixar ${i.name}`} title="Baixar"
                          onClick={() => baixarItem(alvo)} disabled={baixando === alvo}>
                          <Glifo nome="baixar" />
                        </button>
                      )}
                      <Remover rotulo={i.name} aoConfirmar={() => remover(i)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {itens?.length > 0 && (
          <button type="button" className="lista__soltar" onClick={() => entrada.current?.click()}>
            <Glifo nome="enviar" />
            <span>Arraste arquivos para cá ou clique para escolher. Eles serão gravados em <code>{dir}</code>.</span>
          </button>
        )}
      </div>

      {arrastando && (
        <div className="soltar" aria-hidden="true">
          <p>Solte para gravar em <code>{dir}</code> com {replicas ?? `${padraoN ?? "N"} (padrão)`} {replicas === 1 ? "réplica" : "réplicas"} por bloco</p>
        </div>
      )}
    </section>
  );
}
