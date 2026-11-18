import { putFile } from "../../../lib/gateway";

export const dynamic = "force-dynamic";

// POST multipart: file, dir (diretório de destino), replicas (opcional).
export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return Response.json({ detail: "envie um arquivo" }, { status: 400 });
    const dir = String(form.get("dir") || "/").replace(/\/+$/, "");
    const name = file.name.replace(/[\\/]/g, "_");
    const replicas = Number(form.get("replicas")) || null;
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await putFile({ path: `${dir}/${name}`, buffer, replicas });
    return Response.json({ path: `${dir}/${name}`, ...result });
  } catch (e) {
    return Response.json({ detail: e.message }, { status: 422 });
  }
}
