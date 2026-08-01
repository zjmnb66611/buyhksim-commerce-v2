export function normalizeAdminPath(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

export function escapeCsvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

export function parseCsv(content: string, maxRows = 10_001) {
  if (content.includes("\0")) throw new Error("CSV 文件包含非法二进制内容");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (quoted) {
      if (char === '"' && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"' && field.length === 0) quoted = true;
    else if (char === ",") {
      row.push(field.trim());
      field = "";
    } else if (char === "\n") {
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      if (rows.length > maxRows) throw new Error("单次导入不能超过 10,000 行");
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (quoted) throw new Error("CSV 文件包含未闭合的引号");
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length > maxRows) throw new Error("单次导入不能超过 10,000 行");
  return rows;
}

export function triggerDownload(content: BlobPart[], type: string, name: string) {
  const url = URL.createObjectURL(new Blob(content, { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
