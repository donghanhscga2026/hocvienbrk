// Shared CSV parser supports UTF-8 BOM, comma/semicolon and quoted multiline cells.
// Reject malformed input instead of silently shifting columns or truncating rows.
export function parseCrmCsv(raw: string): Record<string, string>[] {
  if (raw.length > 128000) throw new Error('CSV tối đa 128.000 ký tự.')
  const text = raw.replace(/^\uFEFF/, '')
  const header = text.split(/\r?\n/, 1)[0]
  const delimiter = header.includes(';') && !header.includes(',') ? ';' : ','
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false; let ended = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') { quoted = false; ended = true }
      else cell += c
    } else if (c === delimiter || c === '\n' || c === '\r') {
      row.push(cell); cell = ''; ended = false
      if (c !== delimiter) {
        if (c === '\r' && text[i + 1] === '\n') i++
        if (row.some(value => value.trim())) rows.push(row)
        row = []
      }
    } else if (c === '"') {
      if (cell || ended) throw new Error('Dấu ngoặc kép trong CSV không hợp lệ.')
      quoted = true
    } else {
      if (ended) throw new Error('Có ký tự sau dấu ngoặc kép đóng.')
      cell += c
    }
    if (rows.length > 101) throw new Error('Mỗi lần nhập tối đa 100 khách.')
  }
  if (quoted) throw new Error('CSV thiếu dấu ngoặc kép đóng.')
  row.push(cell); if (row.some(value => value.trim())) rows.push(row)
  const columns = rows.shift()?.map(value => value.trim().toLowerCase()) || []
  const allowed = ['name', 'email', 'phone', 'source', 'needs', 'tags']
  if (!columns.includes('name') || !columns.some(value => value === 'email' || value === 'phone') || new Set(columns).size !== columns.length || columns.some(value => !allowed.includes(value))) {
    throw new Error('Cột CSV: name,email,phone,source,needs,tags. Cần name và email hoặc phone.')
  }
  if (!rows.length || rows.length > 100) throw new Error('CSV cần từ 1 đến 100 khách.')
  return rows.map(values => {
    if (values.length !== columns.length) throw new Error('Số ô CSV không khớp tiêu đề.')
    return Object.fromEntries(columns.map((key, i) => [key, values[i]]))
  })
}
export const CRM_CSV_TEMPLATE = 'name,email,phone,source,needs,tags\nKhách thử,khach@example.com,,Facebook,Quan tâm khóa AI,AI\n'
