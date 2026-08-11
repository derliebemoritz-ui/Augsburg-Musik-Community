/** Minimaler CSV-Writer (RFC 4180) ohne externe Abhängigkeit. */
export function toCsvField(value: string | number): string {
  const str = String(value);
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsvRow(fields: (string | number)[]): string {
  return fields.map(toCsvField).join(",") + "\r\n";
}

export function toCsv(header: string[], rows: (string | number)[][]): string {
  return toCsvRow(header) + rows.map(toCsvRow).join("");
}
