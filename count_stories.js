const { PrismaClient } = require("@prisma/client");
process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";
const prisma = new PrismaClient();

async function main() {
  console.log("DATABASE_URL =", process.env.DATABASE_URL);

  const total = await prisma.story.count();
  const any = await prisma.story.findFirst({ select: { id: true, title: true, slug: true, language: true } });

  console.log("TOTAL STORIES =", total);
  console.log("SAMPLE STORY =", any);
}

main()
  .catch((e) => console.error("ERROR:", e))
  .finally(() => prisma.$disconnect());
