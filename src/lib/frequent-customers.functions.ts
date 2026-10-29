import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { statusSchema } from "./orders";
import { rankFrequentCustomers, type CustomerOrderRow } from "./frequent-customers";

export const getFrequentCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.union([z.literal(30), z.literal(90), z.literal(365)]).parse(input))
  .handler(async ({ data: days, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Acesso restrito à administração.");
    const from = new Date(Date.now() - days * 86_400_000).toISOString();
    const rows: CustomerOrderRow[] = [];
    for (let offset = 0; offset < 20_000; offset += 1000) {
      const { data, error } = await context.supabase
        .from("orders")
        .select("id,customer_name,customer_phone,total,status,created_at")
        .gte("created_at", from)
        .neq("status", "cancelled")
        .order("created_at")
        .order("id")
        .range(offset, offset + 999);
      if (error) throw new Error("Não foi possível carregar os clientes.");
      rows.push(...data.map((r) => ({ customer_name: r.customer_name, customer_phone: r.customer_phone, total: Number(r.total), status: statusSchema.parse(r.status), created_at: r.created_at })));
      if (data.length < 1000) break;
    }
    return rankFrequentCustomers(rows);
  });
