import type { CatalogProduct } from "./catalog";
import { brl } from "./products";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function generateCatalogPdf(products: CatalogProduct[], storeName = "S7VEN Lounge e Tabacaria"): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Permita popups para abrir a impressão do catálogo em PDF.");
    return;
  }

  const dateStr = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  const categories = Array.from(new Set(products.map((p) => p.category || "Outros"))).sort();

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Catálogo de Produtos - ${escapeHtml(storeName)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 14mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.35;
    }
    .header {
      border-bottom: 2px solid #ea580c;
      padding-bottom: 8px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header h1 {
      font-size: 18px;
      margin: 0;
      color: #ea580c;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .header p {
      margin: 2px 0 0 0;
      font-size: 10px;
      color: #6b7280;
    }
    .meta {
      text-align: right;
      font-size: 9px;
      color: #6b7280;
    }
    .category-section {
      margin-bottom: 14px;
      page-break-inside: auto;
    }
    .category-title {
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      background: #f3f4f6;
      padding: 4px 8px;
      border-left: 4px solid #ea580c;
      margin: 10px 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .products-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .product-card {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 6px;
      display: flex;
      gap: 8px;
      page-break-inside: avoid;
      background: #ffffff;
    }
    .product-thumb {
      width: 68px;
      height: 68px;
      object-fit: contain;
      border-radius: 4px;
      background: #f9fafb;
      border: 1px solid #f3f4f6;
      flex-shrink: 0;
    }
    .no-thumb {
      width: 68px;
      height: 68px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f4f6;
      border-radius: 4px;
      font-size: 20px;
      flex-shrink: 0;
      color: #9ca3af;
    }
    .product-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    .product-name {
      font-size: 11px;
      font-weight: 700;
      margin: 0 0 2px 0;
      color: #111827;
      line-height: 1.25;
    }
    .product-price {
      font-size: 12px;
      font-weight: 800;
      color: #ea580c;
      margin-bottom: 2px;
    }
    .product-desc {
      font-size: 9.5px;
      color: #4b5563;
      margin: 0 0 3px 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .product-variations {
      font-size: 8.5px;
      color: #374151;
      margin-top: auto;
      background: #f9fafb;
      padding: 2px 4px;
      border-radius: 3px;
      border: 1px solid #f3f4f6;
    }
    .tag {
      display: inline-block;
      background: #e5e7eb;
      border-radius: 2px;
      padding: 1px 3px;
      margin-right: 3px;
      margin-top: 1px;
      font-weight: 500;
    }
    .badge-out {
      color: #dc2626;
      font-weight: 700;
      font-size: 8.5px;
    }
    .no-print-bar {
      background: #111827;
      color: #fff;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      border-radius: 6px;
    }
    .btn {
      background: #ea580c;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
    }
    @media print {
      .no-print-bar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <span>Visualização de Impressão do Catálogo (${products.length} itens)</span>
    <button class="btn" onclick="window.print()">Salvar como PDF / Imprimir</button>
  </div>

  <header class="header">
    <div>
      <h1>${escapeHtml(storeName)}</h1>
      <p>Catálogo Geral de Produtos para Integração e Envio</p>
    </div>
    <div class="meta">
      <div><strong>Total:</strong> ${products.length} produtos</div>
      <div><strong>Emitido em:</strong> ${dateStr}</div>
    </div>
  </header>

  <main>
    ${categories
      .map((cat) => {
        const group = products.filter((p) => (p.category || "Outros") === cat);
        if (!group.length) return "";
        return `
          <section class="category-section">
            <div class="category-title">${escapeHtml(cat)} (${group.length})</div>
            <div class="products-grid">
              ${group
                .map((p) => {
                  const img = p.image || (p.images && p.images[0]) || "";
                  const vars = p.variations || [];
                  const hasVars = vars.length > 0;
                  return `
                    <article class="product-card">
                      ${img
                        ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" class="product-thumb" onerror="this.style.display='none'" />`
                        : `<div class="no-thumb">${escapeHtml(p.emoji || "📦")}</div>`}
                      <div class="product-info">
                        <h2 class="product-name">${escapeHtml(p.name)}</h2>
                        <div class="product-price">${brl(p.price)}</div>
                        ${p.description ? `<p class="product-desc">${escapeHtml(p.description)}</p>` : ""}
                        <div class="product-variations">
                          ${p.stock !== null ? `<span>Estoque: <strong>${p.stock}</strong></span> · ` : ""}
                          ${hasVars
                            ? `<span>${escapeHtml(p.optionLabel || "Variações")}: ` +
                              vars
                                .map(
                                  (v) =>
                                    `<span class="tag">${escapeHtml(v.name)}${v.stock !== null ? ` (${v.stock})` : ""}</span>`
                                )
                                .join("") +
                              `</span>`
                            : "<span>Item sem variações</span>"}
                          ${!p.active ? `<span class="badge-out"> [PAUSADO]</span>` : ""}
                        </div>
                      </div>
                    </article>
                  `;
                })
                .join("")}
            </div>
          </section>
        `;
      })
      .join("")}
  </main>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
