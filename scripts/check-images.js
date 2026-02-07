const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.story.findMany({
      select: { id: true, slug: true, language: true, illustrationUrl: true },
    });

    const placeholder = "/images/placeholder.png";
    const withReal = rows.filter((r) => r.illustrationUrl && r.illustrationUrl !== placeholder);
    const withPlaceholder = rows.filter((r) => !r.illustrationUrl || r.illustrationUrl === placeholder);

    console.log("Total stories:", rows.length);
    console.log("With placeholder:", withPlaceholder.length);
    console.log("With real image:", withReal.length);

    console.log("\n--- Stories with REAL image (not placeholder) ---");
    console.log(JSON.stringify(withReal, null, 2));

    console.log("\n--- First 10 stories (for quick scan) ---");
    console.log(JSON.stringify(rows.slice(0, 10), null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
