import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface TCANode {
  id: number
  type: string
  name: string
  parentFolderId?: number | string
}

interface PreviewResult {
  tcaId: number
  name: string
  type: string
  phone: string
  email: string
  parentTcaId: number | string
  parentUserId: number | null
  referrerId: number | null
  action: string
  existsUser: boolean
  userId: number | null
}

async function main() {
  // TCA tree data từ file đã quét
  const allNodes: TCANode[] = [
    { id: 60073, type: 'folder', name: 'PHẠM THỊ NHUNG', parentFolderId: 'root' },
    { id: 61297, type: 'folder', name: 'NGUYỄN BIÊN CƯƠNG', parentFolderId: 60073 },
    { id: 61752, type: 'item', name: 'NGUYỄN THỊ THANH VÂN', parentFolderId: 61297 },
    { id: 61753, type: 'item', name: 'MAI HUYỀN', parentFolderId: 61297 },
    { id: 61451, type: 'item', name: 'TRẦN THỊ CHÂM', parentFolderId: 60073 },
    { id: 61789, type: 'item', name: 'TRẦN THỊ HUYỀN TRANG', parentFolderId: 60073 },
    { id: 60074, type: 'folder', name: 'TRẦN THỊ THƯƠNG', parentFolderId: 'root' },
    { id: 61345, type: 'item', name: 'NGUYỄN THỊ BÍCH TRANG', parentFolderId: 60074 },
    { id: 61392, type: 'item', name: 'NGUYỄN PHƯƠNG THANH', parentFolderId: 60074 },
    { id: 61483, type: 'item', name: 'HỒ VĂN TRỌNG', parentFolderId: 60074 },
    { id: 61494, type: 'item', name: 'HƯƠNG LÂM CẨM', parentFolderId: 60074 },
    { id: 61928, type: 'folder', name: 'TRẦN THỦY TIÊN', parentFolderId: 60074 },
    { id: 61983, type: 'item', name: 'PHẠM THỊ HỒNG HẠNH', parentFolderId: 61928 },
    { id: 60214, type: 'item', name: 'LÊ LÊ QUẢNG', parentFolderId: 'root' },
    { id: 60943, type: 'folder', name: 'NGUYỄN MINH ĐỨC', parentFolderId: 'root' },
    { id: 61179, type: 'item', name: 'TRẦN THỊ TÙNG', parentFolderId: 60943 },
    { id: 61510, type: 'item', name: 'TRẦN THỊ YẾN', parentFolderId: 60943 },
    { id: 61535, type: 'folder', name: 'NGUYỄN THỊ GÁI', parentFolderId: 60943 },
    { id: 61800, type: 'folder', name: 'HOÀNG THỊ ẤU', parentFolderId: 61535 },
    { id: 61899, type: 'item', name: 'NGUYỄN THỊ LỢI', parentFolderId: 61800 },
  ]

  const memberInfo: Record<number, { phone: string; email: string }> = {
    60073: { phone: '0912307394', email: 'nhungptduoc@gmail.com' },
    60074: { phone: '0769543868', email: 'thuongtuean@gmail.com' },
    60214: { phone: '0849496886', email: 'lequangle75@gmail.com' },
    60943: { phone: '0385669319', email: 'ducdz270303@gmail.com' },
    61297: { phone: '0912426481', email: 'mrsunprince@gmail.com' },
    61451: { phone: '0865708118', email: 'chamnd2023@gmail.com' },
    61789: { phone: '0986561341', email: 'htrang.hau@gmail.com' },
    61345: { phone: '0914207755', email: 'bichtrang021969@gmail.com' },
    61392: { phone: '0904468616', email: 'thanhnph@gmail.com' },
    61483: { phone: '0936099625', email: 'trong.hv77@gmail.com' },
    61494: { phone: '0388625868', email: 'camhuong.vip@gmail.com' },
    61928: { phone: '0327286613', email: 'Tientran.986794@gmail.com' },
    61179: { phone: '0981657865', email: 'tungtran.fx@gmail.com' },
    61510: { phone: '0768593131', email: 'happycoachhaiyen@gmail.com' },
    61535: { phone: '0349969687', email: 'honggai1209@gmail.com' },
    61752: { phone: '0387965959', email: 'thanhvan.meoluoi85@gmail.com' },
    61753: { phone: '0877875421', email: 'scgacademy09@gmail.com' },
    61983: { phone: '0862288577', email: 'Hanhtpdl01@gmail.com' },
    61800: { phone: '0342583986', email: 'beverly.aht@gmail.com' },
    61899: { phone: '0768262945', email: 'boiquyenn@gmail.com' },
  }

  console.log('========================================')
  console.log('TCA SYNC PREVIEW')
  console.log('========================================\n')

  // Map TCA -> User
  const tcaIdToUserId = new Map<number, number>()
  const tcaIdToUser = new Map<number, any>()

  // Lấy users từ DB
  const users = await prisma.user.findMany({ where: { id: { lte: 900 } } })
  const phoneToUser = new Map<string, any>()

  for (const user of users) {
    if (user.phone) {
      const phone = user.phone.replace(/\D/g, '')
      phoneToUser.set(phone, user)
    }
  }

  // Sort nodes: root first, rồi theo hierarchy (parents first)
  const nodeMap = new Map<number, TCANode>()
  allNodes.forEach(n => nodeMap.set(n.id, n))

  function getDepth(node: TCANode): number {
    const pid = node.parentFolderId
    if (!pid || pid === 'root' || pid === '0') return 0
    const parent = nodeMap.get(Number(pid))
    if (!parent) return 0
    return 1 + getDepth(parent)
  }

  const sortedNodes = [...allNodes].sort((a, b) => getDepth(a) - getDepth(b))

  const results: PreviewResult[] = []

  for (const node of sortedNodes) {
    const info = memberInfo[node.id] || {}
    const phone = info.phone || ''
    const normalizedPhone = phone.replace(/\D/g, '')
    const email = info.email || ''

    // Tìm user theo phone
    let existingUser = phoneToUser.get(normalizedPhone)
    let existsUser = !!existingUser

    // Nếu không tìm thấy theo phone, tìm theo email
    if (!existingUser && email) {
      existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (existingUser) existsUser = true
    }

    const userId = existingUser?.id || null

    // Tìm parentUserId từ cây TCA (map đã xử lý)
    let parentUserId: number | null = null
    const parentTcaId = node.parentFolderId

    if (parentTcaId && parentTcaId !== 'root' && parentTcaId !== '0') {
      parentUserId = tcaIdToUserId.get(Number(parentTcaId)) ?? null
    }

    // Tìm referrerId từ User (user.referrerId)
    const referrerId = existingUser?.referrerId || null

    // Determine action
    let action = 'CREATE_USER'
    if (existsUser && existingUser?.referrerId) {
      action = 'EXISTS_ALL'
    } else if (existsUser) {
      action = 'CREATE_SYSTEM_TCAMEMBER'
    }

    // Lưu vào map để dùng cho children
    if (userId) {
      tcaIdToUserId.set(node.id, userId)
      tcaIdToUser.set(node.id, existingUser)
    }

    results.push({
      tcaId: node.id,
      name: node.name,
      type: node.type,
      phone: phone,
      email: email,
      parentTcaId: parentTcaId ?? 'root',
      parentUserId: parentUserId,
      referrerId: referrerId,
      action: action,
      existsUser: existsUser,
      userId: userId,
    })
  }

  // Xuất kết quả
  console.log('=== BƯỚC 1: USER ===')
  console.log('TCA_ID | Name | Phone | Email | Action | ExistingUser')
  console.log('-'.repeat(90))
  for (const r of results) {
    console.log(`${r.tcaId} | ${r.name.substring(0, 20)} | ${r.phone} | ${r.email.substring(0, 20)} | ${r.action} | ${r.existsUser}`)
  }

  console.log('\n=== QUAN HỆ CÂY TCA (cho System.refSysId) ===')
  console.log('TCA_ID | ParentTCA | ParentUserID (refSysId)')
  console.log('-'.repeat(50))
  
  // Sort lại theo depth để in
  const sortedByDepth = [...results].sort((a, b) => {
    if (a.parentTcaId === 'root') return -1
    if (b.parentTcaId === 'root') return 1
    return 0
  })
  
  for (const r of sortedByDepth) {
    console.log(`${r.tcaId} | ${r.parentTcaId} | ${r.parentUserId ?? '-'}`)
  }

  console.log('\n=== REFERERRER (cho user_closure) ===')
  console.log('TCA_ID | UserID | ReferrerID')
  console.log('-'.repeat(40))
  for (const r of results) {
    if (r.existsUser) {
      console.log(`${r.tcaId} | ${r.userId} | ${r.referrerId}`)
    }
  }

  console.log('\n=== TÓM TẮT ===')
  const newUsers = results.filter(r => !r.existsUser).length
  const existsUsers = results.filter(r => r.existsUser).length
  console.log(`Tổng: ${results.length} | New users: ${newUsers} | Existing: ${existsUsers}`)

  await prisma.$disconnect()
}

main().catch(console.error)