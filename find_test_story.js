const { PrismaClient } = require("@prisma/client");
process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.story.findMany({
    where: { title: { contains: "TEST" } },
    select: { id: true, title: true, slug: true, language: true },
  });
  console.log("FOUND TEST ROWS =", rows);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
