import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { statusSchema, type OrderItem } from "./orders";
import { salesPeriodRange, summarizeSales, type SalesRow } from "./sales-report";

export const getSalesReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.enum(["today", "week", "month"]).parse(input))
  .handler(async ({ data: period, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Acesso restrito à administração.");
    const range = salesPeriodRange(period);
    const rows: SalesRow[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await context.supabase.from("orders").select("id,created_at,status,total,items,payment").gte("created_at", range.from).lt("created_at", range.until).order("created_at").order("id").range(offset, offset + 499);
      if (error) throw new Error("Não foi possível carregar o relatório de vendas.");
      rows.push(...data.map(row => ({ created_at: row.created_at, status: statusSchema.parse(row.status), total: Number(row.total), items: row.items as OrderItem[], payment: row.payment })));
      if (data.length < 500) break;
    }
    return { ...summarizeSales(rows), start: range.start, end: range.end };
  });