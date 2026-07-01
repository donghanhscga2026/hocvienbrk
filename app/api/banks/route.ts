import { NextResponse } from 'next/server'

interface BankEntry {
  code: string
  name: string
  shortName: string
  bin: string
}

const FALLBACK_BANKS: BankEntry[] = [
  { code: 'ACB', name: 'Ngân hàng TMCP Á Châu', shortName: 'ACB', bin: '970416' },
  { code: 'LPB', name: 'Ngân hàng TMCP Lộc Phát Việt Nam', shortName: 'LPBank', bin: '970449' },
  { code: 'Vikki', name: 'Ngân hàng TNHH MTV Số Vikki', shortName: 'Vikki', bin: '970406' },
  { code: 'TCB', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam', shortName: 'Techcombank', bin: '970407' },
  { code: 'MB', name: 'Ngân hàng TMCP Quân Đội', shortName: 'MBBank', bin: '970422' },
  { code: 'VIB', name: 'Ngân hàng TMCP Quốc Tế Việt Nam', shortName: 'VIB', bin: '970441' },
  { code: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội', shortName: 'SHB', bin: '970443' },
  { code: 'STB', name: 'Ngân hàng TMCP Sài Gòn Thương Tín', shortName: 'Sacombank', bin: '970403' },
  { code: 'TPB', name: 'Ngân hàng TMCP Tiên Phong', shortName: 'TPBank', bin: '970423' },
  { code: 'VPB', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', shortName: 'VPBank', bin: '970432' },
  { code: 'HDB', name: 'Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh', shortName: 'HDBank', bin: '970437' },
  { code: 'MBV', name: 'Ngân hàng TNHH MTV Việt Nam Hiện Đại', shortName: 'MBV', bin: '970414' },
  { code: 'GPB', name: 'Ngân hàng thương mại TNHH Kỷ Nguyên Thịnh Vượng', shortName: 'GPBank', bin: '970408' },
  { code: 'ABB', name: 'Ngân hàng TMCP An Bình', shortName: 'ABBANK', bin: '970425' },
  { code: 'BVB', name: 'Ngân hàng TMCP Bảo Việt', shortName: 'BaoVietBank', bin: '970438' },
  { code: 'VCCB', name: 'Ngân hàng TMCP Bản Việt', shortName: 'VietCapitalBank', bin: '970454' },
  { code: 'BAB', name: 'Ngân hàng TMCP Bắc Á', shortName: 'BacABank', bin: '970409' },
  { code: 'EIB', name: 'Ngân hàng TMCP Xuất nhập khẩu Việt Nam', shortName: 'Eximbank', bin: '970431' },
  { code: 'KLB', name: 'Ngân hàng TMCP Kiên Long', shortName: 'KienLongBank', bin: '970452' },
  { code: 'MSB', name: 'Ngân hàng TMCP Hàng Hải Việt Nam', shortName: 'MSB', bin: '970426' },
  { code: 'NAB', name: 'Ngân hàng TMCP Nam Á', shortName: 'NamABank', bin: '970428' },
  { code: 'NCB', name: 'Ngân hàng TMCP Quốc dân', shortName: 'NCB', bin: '970419' },
  { code: 'OCB', name: 'Ngân hàng TMCP Phương Đông', shortName: 'OCB', bin: '970448' },
  { code: 'PGB', name: 'Ngân hàng TMCP Thịnh vượng và Phát triển', shortName: 'PGBank', bin: '970430' },
  { code: 'PVCB', name: 'Ngân hàng TMCP Đại Chúng Việt Nam', shortName: 'PVcomBank', bin: '970412' },
  { code: 'SCB', name: 'Ngân hàng TMCP Sài Gòn', shortName: 'SCB', bin: '970429' },
  { code: 'SEAB', name: 'Ngân hàng TMCP Đông Nam Á', shortName: 'SeABank', bin: '970440' },
  { code: 'SGICB', name: 'Ngân hàng TMCP Sài Gòn công thương', shortName: 'SaigonBank', bin: '970400' },
  { code: 'VAB', name: 'Ngân hàng TMCP Việt Á', shortName: 'VietABank', bin: '970427' },
  { code: 'VIETBANK', name: 'Ngân hàng TMCP Việt Nam Thương tín', shortName: 'VietBank', bin: '970433' },
  { code: 'ICB', name: 'Ngân hàng TMCP Công thương Việt Nam', shortName: 'VietinBank', bin: '970415' },
  { code: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', shortName: 'BIDV', bin: '970418' },
  { code: 'VCB', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam', shortName: 'Vietcombank', bin: '970436' },
  { code: 'VBA', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', shortName: 'Agribank', bin: '970405' },
]

function getSortedFallback() {
  return [...FALLBACK_BANKS].sort((a, b) => a.shortName.localeCompare(b.shortName))
}

export async function GET() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch('https://api.vietqr.io/v2/banks', {
      signal: controller.signal,
      next: { revalidate: 86400 },
    })
    clearTimeout(timeoutId)

    if (!response.ok) throw new Error('API failed')

    const json = await response.json()
    const list = json.data ?? []
    if (!Array.isArray(list)) throw new Error('Invalid response')

    const banks = list
      .map((b: any) => ({
        code: b.code,
        name: b.name,
        shortName: b.shortName ?? b.short_name,
        bin: b.bin,
      }))
      .sort((a: any, b: any) => a.shortName.localeCompare(b.shortName))

    return NextResponse.json({ banks })
  } catch {
    return NextResponse.json({ banks: getSortedFallback() })
  }
}
