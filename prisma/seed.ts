import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAdminUser() {
  console.log('🔐 Seeding admin user...');

  const adminExists = await prisma.user.findFirst({
    where: { phoneNumber: 'n-admin' },
  });

  if (adminExists) {
    console.log('✅ Admin user already exists');
    return;
  }

  const adminUser = await prisma.user.create({
    data: {
      phoneNumber: 'n-admin',
      password: 'Adm12345', // In production, use bcrypt.hash()
      fullName: 'Admin User',
      role: 'ADMIN',
      isVerified: true,
      isBlocked: false,
      adminProfile: {
        create: {
          adminLevel: 'SUPER_ADMIN',
        },
      },
    },
    include: {
      adminProfile: true,
    },
  });

  console.log(`✅ Admin user created: ${adminUser.phoneNumber} (ID: ${adminUser.id})`);
}

const servicesData = [
  // ============================================
  // 1. ELECTRICIAN
  // ============================================
  {
    id: 'electrician',
    category: 'Electrician',
    icon: '⚡',
    services: [
      { name: 'Wiring & Rewiring', icon: '⚡' },
      { name: 'Switch & Socket Repair', icon: '🔌' },
      { name: 'Fan Installation & Repair', icon: '💨' },
      { name: 'Light Fitting Installation', icon: '💡' },
      { name: 'Circuit Breaker & DB Board', icon: '🔋' },
      { name: 'UPS & Inverter Installation', icon: '🔌' },
    ],
  },

  // ============================================
  // 2. PLUMBER
  // ============================================
  {
    id: 'plumber',
    category: 'Plumber',
    icon: '🔧',
    services: [
      { name: 'Leak Repair', icon: '💧' },
      { name: 'Pipe Installation', icon: '🔧' },
      { name: 'Tap & Faucet Repair', icon: '🚰' },
      { name: 'Toilet Repair', icon: '🚽' },
      { name: 'Drain Cleaning', icon: '🌊' },
      { name: 'Geyser Installation', icon: '🔥' },
    ],
  },

  // ============================================
  // 3. CARPENTER
  // ============================================
  {
    id: 'carpenter',
    category: 'Carpenter',
    icon: '🪵',
    services: [
      { name: 'Door Repair & Installation', icon: '🚪' },
      { name: 'Cabinet Making', icon: '📦' },
      { name: 'Furniture Repair', icon: '🪑' },
      { name: 'Shelf Installation', icon: '📚' },
      { name: 'Wood Polishing', icon: '✨' },
    ],
  },

  // ============================================
  // 4. PAINTER
  // ============================================
  {
    id: 'painter',
    category: 'Painter',
    icon: '🎨',
    services: [
      { name: 'Wall Painting', icon: '🎨' },
      { name: 'Exterior Painting', icon: '🏠' },
      { name: 'Wood Painting & Polish', icon: '🪵' },
      { name: 'Waterproofing', icon: '🌧️' },
      { name: 'Texture & Design Work', icon: '🎭' },
    ],
  },

  // ============================================
  // 5. AC TECHNICIAN
  // ============================================
  {
    id: 'ac_technician',
    category: 'AC Technician',
    icon: '❄️',
    services: [
      { name: 'AC Installation', icon: '❄️' },
      { name: 'AC Repair', icon: '🔧' },
      { name: 'AC General Service', icon: '🌬️' },
      { name: 'Gas Refilling', icon: '⛽' },
      { name: 'AC Deep Cleaning', icon: '✨' },
    ],
  },

  // ============================================
  // 6. MASON
  // ============================================
  {
    id: 'mason',
    category: 'Mason',
    icon: '🧱',
    services: [
      { name: 'Wall Construction', icon: '🧱' },
      { name: 'Tile Work', icon: '🟫' },
      { name: 'Plastering', icon: '🎨' },
      { name: 'Flooring', icon: '⬜' },
      { name: 'Demolition Work', icon: '💥' },
    ],
  },

  // ============================================
  // 7. MECHANIC
  // ============================================
  {
    id: 'mechanic',
    category: 'Mechanic',
    icon: '🔩',
    services: [
      { name: 'Bike Repair', icon: '🏍️' },
      { name: 'Car Repair', icon: '🚗' },
      { name: 'Oil Change', icon: '🛢️' },
      { name: 'Tire Puncture & Change', icon: '🛞' },
      { name: 'Battery Service', icon: '🔋' },
    ],
  },

  // ============================================
  // 8. HOME CLEANER
  // ============================================
  {
    id: 'home_cleaner',
    category: 'Home Cleaner',
    icon: '🧹',
    services: [
      { name: 'Full Home Cleaning', icon: '🧹' },
      { name: 'Kitchen Deep Clean', icon: '🍳' },
      { name: 'Bathroom Cleaning', icon: '🚿' },
      { name: 'Sofa & Carpet Cleaning', icon: '🛋️' },
      { name: 'Water Tank Cleaning', icon: '💧' },
    ],
  },

  // ============================================
  // 9. TAILORING
  // ============================================
  {
    id: 'tailoring',
    category: 'Tailoring',
    icon: '🧵',
    services: [
      { name: 'Ladies Tailoring', icon: '👗' },
      { name: 'Gents Tailoring', icon: '👔' },
      { name: 'Alterations & Repairs', icon: '🧵' },
    ],
  },

  // ============================================
  // 10. CAR CARE
  // ============================================
  {
    id: 'car_care',
    category: 'Car Care',
    icon: '🚗',
    services: [
      { name: 'Car Wash', icon: '🚗' },
      { name: 'Car Maintenance', icon: '🔧' },
      { name: 'Tire & Puncture Service', icon: '🛞' },
      { name: 'Car Interior Cleaning', icon: '🧹' },
    ],
  },

  // ============================================
  // 11. HOME CONSTRUCTION
  // ============================================
  {
    id: 'home_construction',
    category: 'Home Construction',
    icon: '🏗️',
    services: [
      { name: 'Mason & Tile Work', icon: '🧱' },
      { name: 'Carpenter Services', icon: '🪵' },
      { name: 'Painter Services', icon: '🎨' },
      { name: 'Welding & Iron Work', icon: '⚙️' },
    ],
  },

  // ============================================
  // 12. PEST CONTROL
  // ============================================
  {
    id: 'pest_control',
    category: 'Pest Control',
    icon: '🐜',
    services: [{ name: 'Pest Control', icon: '🐜' }],
  },
];

async function main() {
  const servicesToSeed = servicesData.flatMap((category) =>
    category.services.map((service) => ({
      name: service.name,
      icon: service.icon,
      categoryId: category.id,
      categoryName: category.category,
      categoryIcon: category.icon,
    })),
  );

  console.log(`🌱 Starting seed with admin user and ${servicesToSeed.length} services...`);

  // Seed admin user first
  await seedAdminUser();

  console.log('');
  console.log('🌱 Seeding services...');

  for (const service of servicesToSeed) {
    const created = await prisma.service.upsert({
      where: {
        categoryId_name: {
          categoryId: service.categoryId,
          name: service.name,
        },
      },
      update: {
        iconUrl: service.icon,
        categoryName: service.categoryName,
        categoryIcon: service.categoryIcon,
        isActive: true,
      },
      create: {
        name: service.name,
        iconUrl: service.icon,
        categoryId: service.categoryId,
        categoryName: service.categoryName,
        categoryIcon: service.categoryIcon,
        isActive: true,
      },
    });
    console.log(`✅ ${created.name} (ID: ${created.id})`);
  }

  console.log('✨ Seeding finished successfully!');
  console.log(`📊 Total services seeded: ${servicesToSeed.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
