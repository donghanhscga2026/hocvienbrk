import { workbookZip } from '@/lib/crm/xlsx'

export type ExportCell = string | number | null | { value: number; format: 'date' | 'datetime' }
export type ExportSheet = { name: string; headers: string[]; rows: ExportCell[][]; widths?: number[] }
function xml(value: string) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, 32767).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function column(index: number): string { return index >= 26 ? column(Math.floor(index / 26) - 1) + String.fromCharCode(65 + index % 26) : String.fromCharCode(65 + index) }
// Ngày chọn bắt đầu học là nhãn ngày UTC; ngày giờ nộp/đăng ký là thời điểm
// thực, đổi sang giờ Việt Nam để Excel hiển thị như trên website.
export function exportDate(date: Date | null | undefined, dateOnly = false): ExportCell {
  if (!date) return null
  return { value: date.getTime() / 86400000 + 25569 + (dateOnly ? 0 : 7 / 24), format: dateOnly ? 'date' : 'datetime' }
}
export function courseWorkbook(sheets: ExportSheet[]) {
  if (!sheets.length || sheets.length > 10 || new Set(sheets.map(sheet => sheet.name)).size !== sheets.length) throw new Error('Danh sách sheet không hợp lệ.')
  const files: Record<string, string> = {}
  for (const [sheetIndex, sheet] of sheets.entries()) {
    if (!sheet.headers.length || sheet.headers.length > 16384 || sheet.rows.length > 1048575) throw new Error('Báo cáo vượt giới hạn Excel.')
    const rows = [sheet.headers, ...sheet.rows].map((row, index) => `<row r="${index + 1}">${row.map((cell, c) => {
      const ref = `${column(c)}${index + 1}`
      if (cell == null) return `<c r="${ref}"/>`
      if (typeof cell === 'number') return Number.isFinite(cell) ? `<c r="${ref}" s="0"><v>${cell}</v></c>` : `<c r="${ref}"/>`
      if (typeof cell === 'object') return `<c r="${ref}" s="${cell.format === 'date' ? 3 : 2}"><v>${cell.value}</v></c>`
      // Luôn ghi nội dung người dùng dưới dạng chuỗi, không thực thi công thức.
      return `<c r="${ref}" t="inlineStr" s="${index ? 0 : 1}"><is><t xml:space="preserve">${xml(cell)}</t></is></c>`
    }).join('')}</row>`).join('')
    const cols = sheet.headers.map((_, index) => `<col min="${index + 1}" max="${index + 1}" width="${sheet.widths?.[index] || 24}" customWidth="1"/>`).join('')
    files[`xl/worksheets/sheet${sheetIndex + 1}.xml`] = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${rows}</sheetData><autoFilter ref="A1:${column(sheet.headers.length - 1)}${sheet.rows.length + 1}"/></worksheet>`
  }
  files['[Content_Types].xml'] = `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`
  files['_rels/.rels'] = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
  files['xl/workbook.xml'] = `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, i) => `<sheet name="${xml(sheet.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`
  files['xl/_rels/workbook.xml.rels'] = `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  files['xl/styles.xml'] = '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy hh:mm:ss"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF236C1E"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="4"><xf fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'
  return workbookZip(files, true)
}
