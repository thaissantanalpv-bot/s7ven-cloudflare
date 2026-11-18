import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { catalogFromRows, visibleProducts } from "../../catalog";
import { matchesSearch } from "../../product-search";
import { catalogOutput } from "../catalog-output";

export default defineTool({
  name: "search_products",
  title: "Consultar produtos S7VEN",
  description: "Consulte nomes, preços, opções e disponibilidade do catálogo atual, sem dados de clientes nem alterações.",
  inputSchema: {
    query: z.string().max(120).default("").describe("Nome, categoria ou opção do produto; vazio para listar."),
    offset: z.number().int().min(0).max(2000).default(0).describe("Posição inicial nos resultados da busca."),
    limit: z.number().int().min(1).max(50).default(20).describe("Máximo de resultados devolvidos nesta página."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, offset, limit }, ctx) => {
    const client = await supabaseForUser(ctx);
    const rows = [];
    let truncated = false;
    for (let page = 0; page < 4; page++) {
      const { data, error } = await client.rpc("list_catalog_sales", { _offset: page * 500 });
      if (error) throw new ToolError("Não foi possível consultar o catálogo.");
      rows.push(...(data ?? []));
      if ((data?.length ?? 0) < 500) break;
      if (page === 3) truncated = true;
    }
    const matches = visibleProducts(catalogFromRows(rows)).filter(p => matchesSearch(p, query));
    const products = matches.slice(offset, offset + limit).map(catalogOutput);
    return {
      content: [{ type: "text", text: products.length ? products.map(p => `${p.id}: ${p.name} · R$ ${p.price.toFixed(2)} · ${p.available ? "disponível" : "esgotado"}`).join("\n") : "Nenhum produto encontrado nesta página." }],
      structuredContent: { products, nextOffset: offset + limit < matches.length ? offset + limit : null, truncated },
    };
  },
});