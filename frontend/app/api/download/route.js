import { getFile } from "../../../lib/gateway";

export const dynamic = "force-dynamic";

// GET ?path=/docs/a.bin  ->  bytes do arquivo (blocos e hash final verificados). Avisos vão no cabeçalho X-DFS-Notes.
export async function GET(request) {
  const path = new URL(request.url).searchParams.get("path") || "";
  try {
    const { buffer, notes } = await getFile(path);
    const name = path.split("/").pop() || "arquivo";
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
        "X-DFS-Notes": encodeURIComponent(notes.join("; ")),
      },
    });
  } catch (e) {
    return Response.json({ detail: e.message }, { status: 422 });
  }
}
