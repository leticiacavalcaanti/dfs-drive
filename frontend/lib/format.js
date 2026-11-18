export function bytes(n) {
  if (n == null) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = Number(n);
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export function when(epochSeconds) {
  if (!epochSeconds) return "";
  return new Date(epochSeconds * 1000).toLocaleString("pt-BR");
}

export function join(dir, name) {
  return `${dir.replace(/\/+$/, "")}/${name}`;
}

export function parent(dir) {
  const parts = dir.split("/").filter(Boolean);
  parts.pop();
  return "/" + parts.join("/");
}

// estado do nó ou do arquivo -> classe de cor
export const TONE = {
  alive: "ok", suspect: "warn", dead: "bad",
  "íntegro": "ok", "sub-replicado": "warn", "em recuperação": "info", "perdido": "bad",
};
