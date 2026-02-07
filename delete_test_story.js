const { PrismaClient } = require("@prisma/client");

process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.story.deleteMany({
    where: { slug: "test-oyku" },
  });

  console.log("DELETED COUNT =", result.count);

  const remaining = await prisma.story.count({
    where: { slug: "test-oyku" },
  });

  console.log("REMAINING =", remaining);
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
