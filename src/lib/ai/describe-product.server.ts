import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import { streamText } from "ai";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { cleanAiDescription, PHOTO_PATH_PATTERN } from "@/lib/catalog";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server.ts";

const MODEL = "openai/gpt-6-astra";
const fail = (message: string, status: number) => Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
const inputSchema = z.object({
  name: z.string().trim().min(2).max(150),
  category: z.string().trim().max(100).default(""),
  optionLabel: z.string().max(20).default("Sabor"),
  variations: z.array(z.string().trim().max(40)).max(100).default([]),
  photo: z.string().max(1000).default(""),
});

/** Admin-only: Astra looks the product up on the web (built-in web search) and drafts a short customer-facing description. */
export async function handleDescribeProduct(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.match(/^Bearer \S+$/i)) return fail("Entre na sua conta para usar a IA.", 401);
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return fail("Acesso não configurado.", 500);
  const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization } } });
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return fail("Sua sessão expirou. Entre novamente.", 401);
  const { data: admin, error: roleError } = await client.rpc("has_role", { _user_id: auth.user.id, _role: "admin" });
  if (roleError || !admin) return fail("Somente a administração pode usar a IA.", 403);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Shared AI pause: a credit/permission block from any panel AI tool stops new paid calls.
  const { data: state, error: stateError } = await supabaseAdmin.from("admin_photo_ai_state").select("blocked_reason").eq("user_id", auth.user.id).maybeSingle();
  if (stateError) return fail("Não foi possível conferir o acesso à IA.", 503);
  if (state?.blocked_reason) return fail(state.blocked_reason, 403);
  let input: z.infer<typeof inputSchema>;
  try { input = inputSchema.parse(await request.json()); } catch { return fail("Informe o nome do produto antes de gerar a descrição.", 400); }
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return fail("A IA está sem configuração.", 401);

  // The cover photo helps the model recognize the exact item; it is optional.
  let photo: { data: Uint8Array; mediaType: string } | null = null;
  if (input.photo && PHOTO_PATH_PATTERN.test(input.photo)) {
    try {
      if (input.photo.startsWith("uploads/")) {
        const { data } = await client.storage.from("product-photos").download(input.photo);
        if (data && data.size <= 6 * 1024 * 1024) photo = { data: new Uint8Array(await data.arrayBuffer()), mediaType: data.type || "image/jpeg" };
      } else {
        const res = await fetch(new URL(input.photo, request.url));
        if (res.ok) { const blob = await res.blob(); if (blob.size <= 6 * 1024 * 1024) photo = { data: new Uint8Array(await blob.arrayBuffer()), mediaType: blob.type || "image/jpeg" }; }
      }
    } catch { photo = null; }
  }

  const runId = createLovableAiGatewayRunIdFetch();
  let upstream: { status: number; message: string } | undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (target, init) => {
      const response = await runId.fetch(target, init);
      if (!response.ok) {
        let message = "A IA não conseguiu criar a descrição agora.";
        try { const p = await response.clone().json() as { message?: string; error?: { message?: string } }; message = p.message ?? p.error?.message ?? message; } catch { /* keep generic */ }
        upstream = { status: response.status, message };
        if (response.status === 402 || response.status === 403)
          await supabaseAdmin.from("admin_photo_ai_state").upsert({ user_id: auth.user.id, blocked_reason: message, updated_at: new Date().toISOString() });
      }
      return response;
    },
  });
  const details = [
    `Produto: ${input.name}`,
    input.category && `Categoria: ${input.category}`,
    input.variations.length ? `${input.optionLabel === "Cor" ? "Cores" : "Sabores/variações"} disponíveis: ${input.variations.slice(0, 30).join(", ")}` : "",
  ].filter(Boolean).join("\n");
  try {
    const result = streamText({
      model: provider.responses(MODEL),
      abortSignal: request.signal,
      maxRetries: 0,
      tools: { web_search: provider.tools.webSearch({}) },
      providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
      instructions: "Você escreve descrições curtas de produtos para o catálogo digital da S7VEN Lounge e Tabacaria (Araçatuba, SP), vendidos para maiores de 18 anos. Pesquise o produto na internet para entender o que ele é e como funciona. Escreva em português do Brasil, em 2 ou 3 frases simples (no máximo 350 caracteres), explicando para o cliente o que é o produto, como se usa e o diferencial principal. Use somente informações confirmadas na pesquisa ou visíveis na foto; se não encontrar o produto exato, descreva de forma geral pela categoria, sem inventar marca, medidas, quantidades ou sabores. Não cite preço, estoque, promoções, links, fontes, emojis nem promessas de saúde. Responda apenas com o texto da descrição, sem título e sem markdown.",
      messages: [{ role: "user", content: [
        { type: "text", text: `${details}\n\nEscreva a descrição deste produto para o cliente.` },
        ...(photo ? [{ type: "file" as const, data: photo.data, mediaType: photo.mediaType }] : []),
      ] }],
    });
    const text = cleanAiDescription(await result.text);
    if (!text) return fail("A IA não trouxe uma descrição para este produto. Escreva a descrição manualmente.", 422);
    const headers = new Headers({ "Cache-Control": "no-store" });
    const id = runId.getRunId(); if (id) headers.set("X-Lovable-AIG-Run-ID", id);
    return Response.json({ description: text }, { headers });
  } catch (e) {
    if (request.signal.aborted) return fail("Cancelado.", 499);
    if (upstream) return fail(upstream.status === 429 ? "Muitas solicitações à IA agora. Tente de novo em alguns minutos." : upstream.message, upstream.status);
    console.error("describe-product failed", e);
    return fail("A IA não conseguiu criar a descrição agora. Tente de novo.", 502);
  }
}
