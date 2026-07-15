import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const STATE_FILE_PATH = path.join(process.cwd(), 'plan_temp', 'simulation_state.json')

async function run() {
  const dbSystems = await prisma.system.findMany({
    where: { onSystem: 4 }
  })
  
  // F1 of 3773 in DB
  const dbF1s = dbSystems.filter(s => s.refSysId === 3773)
  console.log(`DB F1s of #3773 (${dbF1s.length} members):`)
  for (const f1 of dbF1s) {
    console.log(`  - #${f1.userId} (level: ${f1.level}, status: ${f1.status}, totalPoints: ${f1.totalPoints})`)
  }

  // F1 of 3773 in Simulation
  if (fs.existsSync(STATE_FILE_PATH)) {
    const simState = JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf-8'))
    const simMembers = simState.memberStates
    const simF1s = simMembers.filter((m: any) => m.refSysId === 3773)
    console.log(`\nSimulation F1s of #3773 (${simF1s.length} members):`)
    for (const f1 of simF1s) {
      console.log(`  - #${f1.userId} (level: ${f1.level}, isConfirmed: ${f1.isConfirmed}, points: ${f1.points})`)
    }
  }
}
run().finally(() => prisma.$disconnect())
