const { PrismaClient } = require("@prisma/client");

async function main() {
  const slug = process.argv[2];
  const url = process.argv[3];

  if (!slug || !url) {
    console.log("Usage: node scripts/set-illustration.js <slug> <url>");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  const before = await prisma.story.findUnique({
    where: { slug },
    select: { id: true, slug: true, language: true, illustrationUrl: true, updatedAt: true },
  });

  if (!before) {
    console.log("Story not found:", slug);
    await prisma.$disconnect();
    process.exit(1);
  }

  const updated = await prisma.story.update({
    where: { slug },
    data: { illustrationUrl: url },
    select: { id: true, slug: true, language: true, illustrationUrl: true, updatedAt: true },
  });

  console.log("Before:", before);
  console.log("After :", updated);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});