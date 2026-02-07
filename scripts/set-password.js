const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function setPassword(email, newPlainPassword, role = 'admin') {
  const hash = await bcrypt.hash(newPlainPassword, 12)

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { password: hash, role, isActive: true },
    create: { email: email.toLowerCase(), password: hash, role, isActive: true, name: 'Admin' },
    select: { id: true, email: true, role: true, isActive: true, password: true },
  })

  console.log('✅ Updated user:', {
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    passwordStartsWith: user.password.slice(0, 4),
  })
}

async function main() {
  // Buradaki şifreleri kendin belirle
  await setPassword('aykut.avci@hotmail.com', 'YeniSifre12345', 'admin')

  // Eski admin mailin neyse onu da ekleyebilirsin:
  // await setPassword('admin@derivekemik.com', 'YeniSifre12345', 'admin')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
