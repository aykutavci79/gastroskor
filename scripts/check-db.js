const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.story.findMany({
      select: {
        id: true,
        slug: true,
        language: true,
        illustrationUrl: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 15,
    });

    console.log("Top 15 recently updated stories:");
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
