// Proxy do navegador para o controlador (status, diretórios, metadados, drain...). Só repassa; nenhum dado de arquivo passa por aqui.
import { CTRL } from "../../../../lib/gateway";

export const dynamic = "force-dynamic";

const ALLOWED = /^(status|metrics|dirs|files\/stat|files|files\/move|nodes\/[\w.-]+\/(drain|undrain))$/;

async function forward(request, { params }) {
  const path = params.path.join("/");
  if (!ALLOWED.test(path)) return Response.json({ detail: "rota não permitida" }, { status: 404 });
  const url = `${CTRL}/${path}${new URL(request.url).search}`;
  const init = { method: request.method, cache: "no-store" };
  if (request.method === "POST") {
    init.headers = { "Content-Type": "application/json" };
    init.body = await request.text();
  }
  try {
    const res = await fetch(url, init);
    return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } });
  } catch {
    return Response.json({ detail: "controlador indisponível" }, { status: 502 });
  }
}

export { forward as GET, forward as POST, forward as DELETE };
