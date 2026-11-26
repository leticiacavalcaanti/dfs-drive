const num = (max) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: max, minimumFractionDigits: 0 });
const n0 = num(0);
const n1 = num(1);

export function tamanho(bytes) {
  if (bytes == null) return "";
  const unidades = ["B", "KB", "MB", "GB", "TB"];
  let v = Number(bytes);
  let i = 0;
  while (v >= 1024 && i < unidades.length - 1) { v /= 1024; i += 1; }
  return `${(v >= 100 || i === 0 ? n0 : n1).format(v)}\u00a0${unidades[i]}`;
}

export const pct = (v) => (v == null ? "?" : `${n1.format(v)}\u00a0%`);
export const inteiro = (v) => n0.format(v ?? 0);
export const decimal = (v) => n1.format(v ?? 0);

export function dataHora(epoch) {
  if (!epoch) return "";
  const d = new Date(epoch * 1000);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (mesmoDia) return `hoje, ${hora}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")}, ${hora}`;
}

export const relogio = (ms) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function caminho(dir, nome) {
  return `${dir.replace(/\/+$/, "")}/${nome}`;
}

export function trechos(dir) {
  const partes = dir.split("/").filter(Boolean);
  return partes.map((p, i) => ({ nome: p, caminho: "/" + partes.slice(0, i + 1).join("/") }));
}

export const NO = {
  alive: { rotulo: "vivo", tom: "ok" },
  suspect: { rotulo: "suspeito", tom: "warn" },
  dead: { rotulo: "caído", tom: "bad" },
};

export const ARQUIVO = {
  "íntegro": { tom: "ok", explica: "todos os blocos com N réplicas vivas" },
  "sub-replicado": { tom: "warn", explica: "algum bloco com menos de N réplicas vivas" },
  "em recuperação": { tom: "info", explica: "cópia de re-replicação em andamento" },
  "perdido": { tom: "bad", explica: "algum bloco sem nenhuma réplica viva" },
};

export const ESTADOS = Object.keys(ARQUIVO);
