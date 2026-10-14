import { google } from 'googleapis'
import { getOAuth2Client } from '@/lib/google-auth'
import { CrmError } from '@/lib/crm/service'
import type { ExportCell, ExportSheet } from './export-workbook'

function googleValue(cell: ExportCell): string | number {
  if (cell == null) return ''
  if (typeof cell !== 'object') return cell
  const date = new Date(Math.round((cell.value - 25569) * 86400000))
  const day = date.toISOString().slice(0, 10).split('-').reverse().join('/')
  return cell.format === 'date' ? day : `${day} ${date.toISOString().slice(11, 19)}`
}

// Chỉ dùng tài khoản Google hệ thống, không thử lần lượt tài khoản gửi email
// của người khác. Chia sẻ cho đúng người yêu cầu xuất, không email cố định.
export async function createCourseGoogleSheet(sheetsData: ExportSheet[], title: string, recipientEmail: string) {
  let spreadsheetId: string | undefined
  let drive: ReturnType<typeof google.drive> | undefined
  try {
    let auth
    if (process.env.GMAIL_REFRESH_TOKEN) {
      auth = getOAuth2Client()
      auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
    } else if (process.env.GOOGLE_SHEETS_SERVICE_KEY) {
      const key = JSON.parse(process.env.GOOGLE_SHEETS_SERVICE_KEY)
      auth = new google.auth.JWT({ email: key.client_email, key: key.private_key, scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'] })
    } else {
      throw new CrmError('Google Sheet chưa được kết nối với tài khoản hệ thống. Dùng Xuất Excel hoặc nhờ quản trị viên cấu hình Google.', 503)
    }
    if (!recipientEmail) throw new CrmError('Tài khoản của bạn chưa có email để nhận quyền truy cập Google Sheet.')
    const sheets = google.sheets({ version: 'v4', auth })
    drive = google.drive({ version: 'v3', auth })
    const created = await sheets.spreadsheets.create({ requestBody: { properties: { title: title.slice(0, 150), locale: 'vi_VN', timeZone: 'Asia/Ho_Chi_Minh' }, sheets: sheetsData.map((sheet, index) => ({ properties: { sheetId: index, title: sheet.name, gridProperties: { rowCount: Math.max(100, sheet.rows.length + 1), columnCount: Math.max(26, sheet.headers.length), frozenRowCount: 1 } } })) } }, { timeout: 20000 })
    spreadsheetId = created.data.spreadsheetId || undefined
    if (!spreadsheetId) throw new Error('Missing spreadsheetId')
    await sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: 'RAW', data: sheetsData.map(sheet => ({ range: `'${sheet.name.replace(/'/g, "''")}'!A1`, values: [sheet.headers, ...sheet.rows.map(row => row.map(googleValue))] })) } }, { timeout: 30000 })
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: sheetsData.flatMap((sheet, sheetId) => [
      { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.14, green: 0.42, blue: 0.12 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, wrapStrategy: 'WRAP' } }, fields: 'userEnteredFormat' } },
      { setBasicFilter: { filter: { range: { sheetId, startRowIndex: 0, endRowIndex: sheet.rows.length + 1, startColumnIndex: 0, endColumnIndex: sheet.headers.length } } } },
    ]) } }, { timeout: 20000 })
    const metadata = await drive.files.get({ fileId: spreadsheetId, fields: 'owners(emailAddress)' }, { timeout: 20000 })
    const alreadyOwner = metadata.data.owners?.some(owner => owner.emailAddress?.toLowerCase() === recipientEmail.toLowerCase())
    if (!alreadyOwner) await drive.permissions.create({ fileId: spreadsheetId, requestBody: { type: 'user', role: 'writer', emailAddress: recipientEmail }, sendNotificationEmail: false }, { timeout: 20000 })
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
  } catch (error) {
    // Nếu chưa ghi/chia sẻ xong, bỏ file dở để không tạo nhiều file rác khi thử lại.
    if (spreadsheetId && drive) await drive.files.delete({ fileId: spreadsheetId }, { timeout: 10000 }).catch(() => {})
    if (error instanceof CrmError) throw error
    const failure = error as { code?: string | number; response?: { status?: number; data?: { error?: { status?: string; errors?: { reason?: string }[] } | string } } }
    const code = failure.response?.status || failure.code
    const reason = typeof failure.response?.data?.error === 'object' ? failure.response.data.error.errors?.[0]?.reason || failure.response.data.error.status : failure.response?.data?.error
    console.error('[CourseGoogleExport]', { code, reason })
    if (code === 401 || reason === 'invalid_grant') throw new CrmError('Kết nối Google đã hết hiệu lực. Quản trị viên cần kết nối lại tài khoản Google; bạn vẫn có thể tải Excel.', 503)
    if (code === 403) throw new CrmError('Google từ chối quyền tạo hoặc chia sẻ bảng tính. Kiểm tra quyền Sheets/Drive và dung lượng tài khoản Google hệ thống; bạn vẫn có thể tải Excel.', 503)
    if (code === 429) throw new CrmError('Google đang giới hạn số lần xuất. Hãy thử lại sau hoặc tải Excel.', 503)
    throw new CrmError('Chưa tạo được Google Sheet. Quản trị viên có thể kiểm tra log CourseGoogleExport; bạn vẫn có thể tải Excel.', 503)
  }
}
