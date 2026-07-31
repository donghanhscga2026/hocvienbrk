// Ban do mapping danh sach day du 55+ ngan hang tai Viet Nam theo tieu chuan VietQR (NAPAS)
// Du lieu duoc dong bo hoa tu API chinh thuc: https://api.vietqr.io/v2/banks
const BIN_MAP: Record<string, string> = {
  // ABBANK
  'ABB': '970425', 'ABBANK': '970425', 'ANBINH': '970425', 'NGAN HANG TMCP AN BINH': '970425', 'AB BANK': '970425',
  
  // ACB
  'ACB': '970416', 'A CHAU': '970416', 'ACHAU': '970416', 'NGAN HANG TMCP A CHAU': '970416',
  
  // AGRIBANK
  'AGRIBANK': '970405', 'AGR': '970405', 'NGAN HANG NONG NGHIEP VA PHAT TRIEN NONG THON VIET NAM': '970405',
  
  // ANZ
  'ANZ': '970444', 'ANZ BANK': '970444', 'NGAN HANG ANZ VIET NAM': '970444',
  
  // BAC A BANK
  'BAB': '970409', 'BACA': '970409', 'BACABANK': '970409', 'NGAN HANG TMCP BAC A': '970409',
  
  // BAOVIET BANK
  'BVB': '970438', 'BAOVIET': '970438', 'BAOVIETBANK': '970438', 'NGAN HANG TMCP BAO VIET': '970438',
  
  // BIDC
  'BIDC': '970455', 'NGAN HANG DAU TU VA PHAT TRIEN CAMPUCHIA': '970455',
  
  // BIDV
  'BIDV': '970418', 'BID': '970418', 'NGAN HANG TMCP DAU TU VA PHAT TRIEN VIET NAM': '970418',
  
  // BVB (Ban Viet / BVBank)
  'BVBANK': '970454', 'VIETCAPITALBANK': '970454', 'VCCB': '970454', 'NGAN HANG TMCP BAN VIET': '970454', 'BAN VIET': '970454',
  
  // CAKE
  'CAKE': '546034', 'CAKE BY VPBANK': '546034',
  
  // CBBANK
  'CBB': '970440', 'CBBANK': '970440', 'NGAN HANG THUONG MAI TNHH MTV XAY DUNG VIET NAM': '970440',
  
  // CIMB
  'CIMB': '422589', 'NGAN HANG CIMB VIET NAM': '422589',
  
  // COOPBANK
  'COOPBANK': '970446', 'CO-OP BANK': '970446', 'NGAN HANG HOP TAC XA VIET NAM': '970446',
  
  // DONGABANK
  'DAB': '970406', 'DONGABANK': '970406', 'DONG A': '970406', 'NGAN HANG TMCP DONG A': '970406',
  
  // EXIMBANK
  'EIB': '970431', 'EXIMBANK': '970431', 'NGAN HANG TMCP XUAT NHAP KHAU VIET NAM': '970431',
  
  // GPBANK
  'GPB': '970408', 'GPBANK': '970408', 'DAU KHI TOAN CAU': '970408', 'NGAN HANG DAU KHI TOAN CAU': '970408',
  
  // HDBANK
  'HDB': '970437', 'HDBANK': '970437', 'NGAN HANG TMCP PHAT TRIEN THANH PHO HO CHI MINH': '970437',
  
  // HONGLEONG
  'HLB': '970442', 'HONGLEONG': '970442', 'NGAN HANG TNHH MTV HONG LEONG VIET NAM': '970442',
  
  // HSVN (HSBC)
  'HSBC': '970447', 'HSVN': '970447', 'NGAN HANG TNHH MTV HSBC VIET NAM': '970447',
  
  // IBK
  'IBK': '970456', 'INDUSTRIAL BANK OF KOREA': '970456',
  
  // INDOVINABANK
  'IVB': '970434', 'INDOVINA': '970434', 'INDOVINABANK': '970434',
  
  // KBANK
  'KBANK': '668888', 'KASIKORNBANK': '668888',
  
  // KEB HANA
  'HNAB': '970457', 'KEB HANA BANK': '970457',
  
  // KIENLONGBANK
  'KLB': '970452', 'KIENLONG': '970452', 'KIENLONGBANK': '970452', 'NGAN HANG TMCP KIEN LONG': '970452',
  
  // Kookmin
  'KBHN': '970462', 'KOOKMIN BANK': '970462',
  
  // LIENVIETPOSTBANK (LPBank)
  'LPB': '970449', 'LPBANK': '970449', 'LIENVIETPOSTBANK': '970449', 'BUU DIEN LIEN VIET': '970449', 'NGAN HANG TMCP LOC PHAT VIET NAM': '970449',
  
  // LotteFinance
  'LOTTE': '970460', 'LOTTE FINANCE': '970460',
  
  // MBBANK
  'MB': '970422', 'MBB': '970422', 'MBBANK': '970422', 'MILITARY': '970422', 'NGAN HANG TMCP QUAN DOI': '970422', 'QUAN DOI': '970422',
  
  // MSB
  'MSB': '970426', 'MARITIME': '970426', 'MARITIMEBANK': '970426', 'NGAN HANG TMCP HANG HAI VIET NAM': '970426', 'HANG HAI': '970426',
  
  // NAM A BANK
  'NAB': '970428', 'NAMA': '970428', 'NAMABANK': '970428', 'NGAN HANG TMCP NAM A': '970428', 'NAM A': '970428',
  
  // NCBANK
  'NCB': '970419', 'NCBANK': '970419', 'QUOC DAN': '970419', 'NGAN HANG TMCP QUOC DAN': '970419',
  
  // Nonghyup
  'NHB': '970463', 'NONGHYUP BANK': '970463',
  
  // OCB
  'OCB': '970448', 'ORIENT': '970448', 'ORIENTBANK': '970448', 'PHUONG DONG': '970448', 'NGAN HANG TMCP PHUONG DONG': '970448',
  
  // OCEANBANK
  'OJB': '970402', 'OCEANBANK': '970402', 'DAI DUONG': '970402', 'NGAN HANG TMCP DAI DUONG': '970402',
  
  // PGBANK
  'PGB': '970430', 'PGBANK': '970430', 'PETROLIMEX': '970430', 'NGAN HANG TMCP XANG DAU PETROLIMEX': '970430', 'THINH VUONG VA PHAT TRIEN': '970430',
  
  // PUBLICBANK
  'PBVN': '970439', 'PUBLICBANK': '970439', 'NGAN HANG TNHH MTV PUBLIC VIET NAM': '970439',
  
  // PVCOMBANK
  'PVC': '970412', 'PVCOMBANK': '970412', 'TRI VIET': '970412', 'NGAN HANG TMCP DAI CHUNG VIET NAM': '970412',
  
  // SACOMBANK
  'STB': '970403', 'SACOMBANK': '970403', 'SAI GON THUONG TIN': '970403', 'NGAN HANG TMCP SAI GON THUONG TIN': '970403',
  
  // SAIGONBANK
  'SGB': '970400', 'SAIGONBANK': '970400', 'SAI GON CONG THUONG': '970400', 'NGAN HANG TMCP SAI GON CONG THUONG': '970400',
  
  // SCB
  'SCB': '970429', 'SAI GON': '970429', 'NGAN HANG TMCP SAI GON': '970429',
  
  // SeABank
  'SEAB': '970440', 'SEABANK': '970440', 'DONG NAM A': '970440', 'NGAN HANG TMCP DONG NAM A': '970440',
  
  // SHB
  'SHB': '970443', 'SAI GON - HAN NOI': '970443', 'NGAN HANG TMCP SAI GON - HAN NOI': '970443',
  
  // SHINHAN
  'SHN': '970424', 'SHINHAN': '970424', 'SHINHANBANK': '970424', 'NGAN HANG TNHH MTV SHINHAN VIET NAM': '970424',
  
  // Standard Chartered
  'SCVN': '970410', 'STANDARD CHARTERED': '970410', 'STANDARD CHARTERED BANK': '970410',
  
  // Techcombank
  'TCB': '970407', 'TECHCOMBANK': '970407', 'KY THUONG': '970407', 'NGAN HANG TMCP KY THUONG VIET NAM': '970407',
  
  // TPBank
  'TPB': '970423', 'TPBANK': '970423', 'TIEN PHONG': '970423', 'NGAN HANG TMCP TIEN PHONG': '970423',
  
  // UOB
  'UOB': '970458', 'UNITED OVERSEAS BANK': '970458', 'NGAN HANG UOB VIET NAM': '970458',
  
  // VBSP (Chinh sach xa hoi)
  'VBSP': '970420', 'NGAN HANG CHINH SACH XA HOI VIET NAM': '970420',
  
  // VietBank
  'VIETBANK': '970433', 'VIET NAM THUONG TIN': '970433', 'NGAN HANG TMCP VIET NAM THUONG TIN': '970433',
  
  // VietCapitalBank (BVBank)
  'VIETCAPITAL': '970454',
  
  // Vietcombank
  'VCB': '970436', 'VIETCOMBANK': '970436', 'NGOAI THUONG': '970436', 'NGAN HANG TMCP NGOAI THUONG VIET NAM': '970436',
  
  // VietinBank
  'CTG': '970415', 'VIETINBANK': '970415', 'CONG THUONG': '970415', 'NGAN HANG TMCP CONG THUONG VIET NAM': '970415',
  
  // VietLife (VPL)
  'VPL': '970414', 'VIETNAM THUONG TIN': '970414',
  
  // Vikki (HDBank Digital)
  'VIKKI': '970406',
  
  // VPBank
  'VPB': '970432', 'VPBANK': '970432', 'VIET NAM THINH VUONG': '970432', 'NGAN HANG TMCP VIET NAM THINH VUONG': '970432',
  
  // VRB (Viet - Nga)
  'VRB': '970421', 'VIET NGA': '970421', 'NGAN HANG LIEN DOANH VIET - NGA': '970421',
  
  // Woori Bank
  'WRB': '970427', 'WOORI': '970427', 'WOORIBANK': '970427', 'NGAN HANG WOORI VIET NAM': '970427'
}

/**
 * Ham loai bo dau tieng Viet
 */
function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Phan tich va chuyen ten ngan hang thanh ma BIN (Bank Identification Number) hop le cua NAPAS
 */
export function resolveBankBin(bankName: string | null | undefined): string {
  if (!bankName) return '970403' // Mac dinh Sacombank neu rong
  
  // Chuyen sang chu khong dau va viet hoa
  const key = removeVietnameseTones(bankName).toUpperCase().trim()
  
  // 1. Kiem tra neu input truc tiep la ma BIN dang so
  if (/^\d{6}$/.test(key)) {
    return key
  }
  
  // 2. Tim kiem chinh xac trong ban do mapping khong dau
  if (BIN_MAP[key]) {
    return BIN_MAP[key]
  }

  // 3. Phan tich tim kiem tuong doi
  const cleanKey = key.replace(/NGAN\s*HANG|TMCP|MTV|TNHH|VIET\s*NAM/g, '').trim()
  
  // Tim tu khoa gan dung
  const foundKey = Object.keys(BIN_MAP).find(k => 
    k.length > 2 && (cleanKey.includes(k) || k.includes(cleanKey))
  )
  
  if (foundKey) {
    return BIN_MAP[foundKey]
  }
  
  return '970403' // Mac dinh Sacombank
}
