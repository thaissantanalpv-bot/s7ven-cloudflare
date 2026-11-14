import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { editImage, editImageStream, GatewayError } from "@lovable.dev/ai-gateway";

const fail = (message: string, status: number) => new Response(message, { status, headers: { "Cache-Control": "no-store" } });
export async function handlePhotoEdit(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.match(/^Bearer \S+$/i)) return fail("Entre na sua conta para editar fotos.", 401);
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return fail("Acesso às fotos não configurado.", 500);
  const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization } } });
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return fail("Sua sessão expirou. Entre novamente.", 401);
  const { data: admin, error: roleError } = await client.rpc("has_role", { _user_id: auth.user.id, _role: "admin" });
  if (roleError || !admin) return fail("Somente a administradora pode editar fotos.", 403);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: state, error: stateError } = await supabaseAdmin.from("admin_photo_ai_state").select("blocked_reason").eq("user_id", auth.user.id).maybeSingle();
  if (stateError) return fail("Não foi possível conferir o acesso à IA.", 503);
  if (state?.blocked_reason) return fail(state.blocked_reason, 403);
  if (Number(request.headers.get("content-length") ?? 0) > 6*1024*1024) return fail("Use fotos de até 5 MB.", 413);
  let input: FormData;
  try { input = await request.formData(); } catch { return fail("Não foi possível ler a foto.", 400); }
  const image = input.get("image");
  const prompt = input.get("prompt");
  const name = input.get("productName");
  if (!(image instanceof File) || !["image/jpeg","image/png","image/webp"].includes(image.type) || image.size > 5*1024*1024 || !image.size) return fail("Use JPG, PNG ou WebP de até 5 MB.", 400);
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 2000 || typeof name !== "string" || name.length > 150) return fail("Informe a alteração desejada, até 2.000 caracteres.", 400);
  const payload = {
    model: "openai/gpt-image-2.5-sunburst" as const,
    image,
    quality: input.get("quality") === "high" ? "high" as const : "medium" as const,
    size: "auto" as const,
    output_format: "png" as const,
    prompt: `Edite a fotografia de produto para o catálogo da S7VEN. Produto informado: ${name}. Preserve exatamente o produto real, formato, proporções, cores, marca, rótulos e textos legíveis. Não adicione outros produtos ou acessórios não existentes. Mostre o item inteiro, com iluminação natural de fotografia comercial. Altere apenas qualidade, iluminação e cenário conforme solicitado. Instrução da administradora: ${prompt}`,
  };
  try {
    if (input.get("stream") === "false") {
      const result = await editImage(payload, { signal: request.signal });
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    }
    const stream = await editImageStream({ ...payload, partial_images: 1 }, { signal: request.signal });
    return stream.toResponse({ headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof GatewayError) {
      const status = error.httpStatus ?? 503;
      const reason = status === 402 || status === 403
        ? "O acesso à edição de fotos está bloqueado. Confira os créditos e permissões."
        : "Não foi possível concluir a edição. Tente novamente mais tarde.";
      if (status === 402 || status === 403) {
        await supabaseAdmin.from("admin_photo_ai_state").upsert({ user_id: auth.user.id, blocked_reason: reason, updated_at: new Date().toISOString() });
      }
      return fail(reason, status);
    }
    return fail("Não foi possível concluir a edição. Tente novamente mais tarde.", 503);
  }
}