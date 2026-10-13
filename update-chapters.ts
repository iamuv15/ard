import prisma from './src/lib/prisma'
async function main() {
  await prisma.chapter.updateMany({ data: { cohort: 'ALPHA' } });
  console.log('Updated all chapters to ALPHA');
}
main().catch(console.error).finally(() => prisma.$disconnect());
