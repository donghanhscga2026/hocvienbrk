import prisma from '../lib/prisma'

async function verify() {
  console.log('🔍 Verifying database...\n')
  
  try {
    // Check SiteProfile table
    const profiles = await prisma.siteProfile.findMany()
    console.log('📊 SiteProfiles:', profiles.length)
    profiles.forEach(p => {
      console.log('  -', p.slug, '|', p.title, '| isActive:', p.isActive, '| isDefault:', p.isDefault)
    })
    
    // Check Course.teacherId
    const courses = await prisma.course.findMany({ take: 3, select: { id: true, name_lop: true, teacherId: true } })
    console.log('\n📚 Courses (sample):', courses.length)
    courses.forEach(c => console.log('  - Course', c.id, ':', c.name_lop, '| teacherId:', c.teacherId))
    
    // Check Survey.profileId
    const surveys = await prisma.survey.findMany({ take: 3, select: { id: true, name: true, profileId: true } })
    console.log('\n📝 Surveys (sample):', surveys.length)
    surveys.forEach(s => console.log('  - Survey', s.id, ':', s.name, '| profileId:', s.profileId))
    
    // Check AffiliateCampaign.profileId
    const campaigns = await prisma.affiliateCampaign.findMany({ take: 3, select: { id: true, name: true, profileId: true } })
    console.log('\n💰 Campaigns (sample):', campaigns.length)
    campaigns.forEach(c => console.log('  - Campaign', c.id, ':', c.name, '| profileId:', c.profileId))
    
    console.log('\n✅ Database verification complete!')
  } catch (error) {
    console.error('❌ Verification failed:', error)
  }
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
