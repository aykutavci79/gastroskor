import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function changeAdminPassword() {
  try {
    console.log('\n🔐 Admin şifresi değiştiriliyor...\n')
    
    const newPassword = 'Aa798110++!'
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    // Find admin user
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@derivekemik.com' }
    })
    
    if (!admin) {
      console.log('❌ Admin kullanıcı bulunamadı!')
      return
    }
    
    console.log(`📧 Admin email: ${admin.email}`)
    console.log(`🆔 Admin ID: ${admin.id}`)
    
    // Update password
    await prisma.user.update({
      where: { email: 'admin@derivekemik.com' },
      data: { password: hashedPassword }
    })
    
    console.log('\n✅ Şifre başarıyla değiştirildi!')
    console.log('\n📋 Yeni giriş bilgileri:')
    console.log('   Email: admin@derivekemik.com')
    console.log('   Şifre: Aa798110++!')
    console.log('\n⚠️  Bu şifreyi güvenli bir yerde saklayın!')
    
    // Verify new password
    const updatedAdmin = await prisma.user.findUnique({
      where: { email: 'admin@derivekemik.com' }
    })
    
    if (updatedAdmin) {
      const isValid = await bcrypt.compare(newPassword, updatedAdmin.password)
      if (isValid) {
        console.log('\n✅ Şifre doğrulaması başarılı!')
      } else {
        console.log('\n❌ Şifre doğrulaması başarısız!')
      }
    }
    
  } catch (error) {
    console.error('\n❌ Hata:', error)
  } finally {
    await prisma.$disconnect()
  }
}

changeAdminPassword()
