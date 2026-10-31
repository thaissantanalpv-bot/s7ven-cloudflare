import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ratingLookupSchema, submitRatingSchema } from "./ratings";

// Public: only someone holding the private link sent by the store (order id + random token) can read or rate.
async function findOrder(id: string, token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("orders").select("id,number,status,rating_token").eq("id", id).maybeSingle();
  if (error) throw new Error("Não foi possível abrir a avaliação. Tente novamente.");
  if (!data || data.rating_token !== token) throw new Error("Link de avaliação inválido.");
  return { supabaseAdmin, order: data };
}

export const ratingInfo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ratingLookupSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin, order } = await findOrder(data.id, data.token);
    const { data: existing } = await supabaseAdmin.from("order_ratings").select("rating").eq("order_id", order.id).maybeSingle();
    return { delivered: order.status === "delivered", rated: existing?.rating ?? null };
  });

export const submitRating = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitRatingSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin, order } = await findOrder(data.id, data.token);
    if (order.status !== "delivered") throw new Error("A avaliação abre depois que o pedido for entregue.");
    const { error } = await supabaseAdmin.from("order_ratings").insert({ order_id: order.id, rating: data.rating, comment: data.comment });
    if (error?.code === "23505") throw new Error("Este pedido já foi avaliado. Obrigado!");
    if (error) throw new Error("Não foi possível salvar sua avaliação. Tente novamente.");
    return { saved: true };
  });

export const listRatings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Acesso restrito à administração.");
    const { data, error } = await context.supabase
      .from("order_ratings")
      .select("order_id,rating,comment,created_at,orders(number,customer_name)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error("Não foi possível carregar as avaliações.");
    return z
      .array(z.object({ order_id: z.string(), rating: z.number(), comment: z.string(), created_at: z.string(), orders: z.object({ number: z.number(), customer_name: z.string() }).nullable() }))
      .parse(data);
  });
