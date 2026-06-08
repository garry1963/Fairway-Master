/**
 * Helper utility to export Javascript arrays/objects to well-formatted CSV files.
 */

export function convertToCSV(headers: string[], rows: any[][]): string {
  const sanitize = (val: any) => {
    if (val === null || val === undefined) return '';
    let stringVal = '';
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return '';
      stringVal = val.toISOString().split('T')[0];
    } else {
      stringVal = String(val);
    }
    
    // Escape double quotes (standard RFC 4180 CSV escaping)
    const escaped = stringVal.replace(/"/g, '""');
    
    // If the value contains commas, double quotes, or newlines, wrap it in double quotes
    if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') || escaped.includes('\r')) {
      return `"${escaped}"`;
    }
    return escaped;
  };

  const csvRows = [
    headers.map(h => sanitize(h)).join(','),
    ...rows.map(row => row.map(cell => sanitize(cell)).join(','))
  ];

  return csvRows.join('\r\n');
}

export function downloadCSV(filename: string, content: string) {
  // Add UTF-8 Byte Order Mark (BOM) to support correct encoding of symbols, e.g., in Excel
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
