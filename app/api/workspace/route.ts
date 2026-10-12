import {
  identityFromRequest,
  prepareWorkspace,
  readWorkspace,
} from "@/db/workspace";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = await identityFromRequest(request);
  if (!identity) {
    return Response.json({ error: "Oturum doğrulanamadı. Sayfayı yenileyip tekrar dene." }, { status: 401 });
  }

  try {
    const importedSets = await prepareWorkspace(identity.id, !identity.isAutomation);
    const workspace = await readWorkspace(identity, importedSets);
    return Response.json(workspace, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Workspace load failed", error);
    return Response.json(
      { error: "Çalışma alanı yüklenemedi. Verilerin güvende; lütfen tekrar dene." },
      { status: 503 },
    );
  }
}
