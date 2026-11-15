/** Encode every cell, including customer/catalog text, as inert spreadsheet data. */
export function csvCell(value: string): string {
  const safe = /^[\s\u0000-\u001f\u007f]*[=+\-@＝＋－＠]|^[\t\r\n]/u.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function csvDocument(rows: string[][]): string {
  return "\uFEFF" + rows.map(row => row.map(csvCell).join(";")).join("\r\n");
}