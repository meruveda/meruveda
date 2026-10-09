/** Shared Excel export helpers — real .xlsx workbooks via lazy `xlsx` import. */

export async function writeWorkbook(
  sheets: Record<string, Record<string, unknown>[]>,
  fileName: string,
) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    const safeRows = rows.length > 0 ? rows : [{ Note: 'No data for the selected filters' }];
    const ws = XLSX.utils.json_to_sheet(safeRows);
    // Auto-size columns from content (capped so one long cell can't blow out the sheet).
    const keys = Object.keys(safeRows[0] || {});
    ws['!cols'] = keys.map((k) => {
      const max = safeRows.reduce(
        (m, r) => Math.max(m, String((r as any)[k] ?? '').length),
        k.length,
      );
      return { wch: Math.min(48, Math.max(12, max + 2)) };
    });
    XLSX.utils.book_append_sheet(workbook, ws, name.slice(0, 31));
  }
  XLSX.writeFile(workbook, fileName);
}

export const excelFileName = (prefix: string) =>
  `${prefix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
