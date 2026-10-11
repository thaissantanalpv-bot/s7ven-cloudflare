import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { conversationSchema } from "./assistant";

export const loadAssistantConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Apenas a administradora pode consultar a assistente.");
    const { data, error } = await context.supabase.rpc("ensure_admin_ai_conversation");
    if (error) throw new Error("Não foi possível carregar a conversa.");
    return conversationSchema.parse(data);
  });