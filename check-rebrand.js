const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient();
async function checkTable(modelName, fields) {
  const OR = [];
  for (const f of fields) {
    OR.push({ [f]: { contains: 'học viện', mode: 'insensitive' } });
    OR.push({ [f]: { contains: 'BRK', mode: 'insensitive' } });
    OR.push({ [f]: { contains: 'hoc vien', mode: 'insensitive' } });
  }
  const count = await prisma[modelName].count({ where: { OR } });
  console.log(modelName + ' -> ' + count);
}
async function main() {
  await checkTable('post', ['title', 'content']);
  await checkTable('postComment', ['content']);
  await checkTable('postCategory', ['name', 'description']);
  await checkTable('survey', ['name', 'description']);
  await checkTable('assistantGuide', ['title', 'textContent']);
}
main().finally(() => process.exit(0));
