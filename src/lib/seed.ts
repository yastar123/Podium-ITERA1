import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const hashedAdminPassword = await bcrypt.hash('admin123', 12)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ticketwar.com' },
    update: {},
    create: {
      email: 'admin@ticketwar.com',
      name: 'Admin Ticket War',
      password: hashedAdminPassword,
      role: 'ADMIN',
    },
  })

  // Create sample student
  const hashedStudentPassword = await bcrypt.hash('student123', 12)
  
  const student = await prisma.user.upsert({
    where: { email: 'student@university.ac.id' },
    update: {},
    create: {
      email: 'student@university.ac.id',
      name: 'John Doe',
      nim: '12345678',
      password: hashedStudentPassword,
      role: 'STUDENT',
    },
  })

  // Create sample events
  const event1 = await prisma.event.upsert({
    where: { id: 'sample-tech-talk' },
    update: {},
    create: {
      id: 'sample-tech-talk',
      name: 'Tech Talk: AI & Machine Learning',
      description: 'Seminar teknologi tentang AI dan Machine Learning untuk mahasiswa',
      location: 'Auditorium Utama, Gedung A',
      eventDate: new Date('2025-10-01T10:00:00Z'),
      quota: 200,
      batchSize: 200,
      isActive: true,
    },
  })

  const event2 = await prisma.event.upsert({
    where: { id: 'sample-workshop' },
    update: {},
    create: {
      id: 'sample-workshop',
      name: 'Workshop Web Development',
      description: 'Workshop praktis membuat website dengan React dan Next.js',
      location: 'Lab Komputer, Gedung B',
      eventDate: new Date('2025-10-15T14:00:00Z'),
      quota: 50,
      batchSize: 50,
      isActive: true,
    },
  })

  const event3 = await prisma.event.upsert({
    where: { id: 'sample-career-fair' },
    update: {},
    create: {
      id: 'sample-career-fair',
      name: 'Career Fair 2025',
      description: 'Pameran karir dan rekrutment untuk mahasiswa tingkat akhir',
      location: 'Hall Utama Kampus',
      eventDate: new Date('2025-11-01T09:00:00Z'),
      quota: 500,
      batchSize: 500,
      isActive: true,
    },
  })

  console.log('Seeding completed!')
  console.log('Admin credentials: admin@ticketwar.com / admin123')
  console.log('Student credentials: student@university.ac.id / student123')
  console.log(`Created events: ${event1.name}, ${event2.name}, ${event3.name}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })