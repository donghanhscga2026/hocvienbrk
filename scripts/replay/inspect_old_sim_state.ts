import * as fs from 'fs'
import * as path from 'path'

const STATE_FILE_PATH = path.join(process.cwd(), 'plan_temp', 'simulation_state.json')

function main() {
  if (!fs.existsSync(STATE_FILE_PATH)) {
    console.log("❌ File state not found!")
    return
  }

  const data = JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf-8'))
  const memberStates: any[] = data.memberStates

  const user26 = memberStates.find(m => m.userId === 26)
  console.log("=== THÔNG TIN USER #26 TRONG STATE GIẢ LẬP CŨ ===")
  console.log(user26)

  // In thêm 1 số user khác để đối chiếu
  const sampleUserIds = [965, 974, 478, 7, 944]
  console.log("\n=== THÔNG TIN CÁC USER KHÁC TRONG STATE GIẢ LẬP CŨ ===")
  for (const uid of sampleUserIds) {
    console.log(memberStates.find(m => m.userId === uid))
  }
}

main()
