import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');
  
  // Add your seed data here
  // Example:
  // const user = await prisma.user.create({
  //   data: {
  //     email: 'test@example.com',
  //     name: 'Test User',
  //     password: 'hashed_password',
  //   },
  // });
  // console.log('Created user:', user);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
