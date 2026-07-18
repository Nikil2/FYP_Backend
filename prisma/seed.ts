import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

/**
 * Karachi areas with approximate centre coordinates, and their rough
 * straight-line distance from Clifton (24.8138, 67.0300) — the reference point
 * used for testing the nearby-workers radius search.
 */
const KARACHI_AREAS = [
  { name: 'Clifton', lat: 24.8138, lng: 67.03, kmFromClifton: 0 },
  { name: 'DHA Phase 5', lat: 24.8, lng: 67.04, kmFromClifton: 1.8 },
  { name: 'DHA Phase 6', lat: 24.795, lng: 67.055, kmFromClifton: 3.3 },
  { name: 'Saddar', lat: 24.86, lng: 67.03, kmFromClifton: 5.1 },
  { name: 'PECHS', lat: 24.87, lng: 67.065, kmFromClifton: 7.2 },
  { name: 'Lyari', lat: 24.875, lng: 67.005, kmFromClifton: 7.2 },
  { name: 'Korangi', lat: 24.84, lng: 67.13, kmFromClifton: 10.5 },
  { name: 'Nazimabad', lat: 24.91, lng: 67.03, kmFromClifton: 10.7 },
  { name: 'Gulshan-e-Iqbal', lat: 24.92, lng: 67.09, kmFromClifton: 13.3 },
  { name: 'North Nazimabad', lat: 24.935, lng: 67.04, kmFromClifton: 13.5 },
  { name: 'Orangi Town', lat: 24.95, lng: 66.99, kmFromClifton: 15.6 },
  { name: 'Gulistan-e-Johar', lat: 24.925, lng: 67.13, kmFromClifton: 15.9 },
  { name: 'Landhi', lat: 24.85, lng: 67.19, kmFromClifton: 16.6 },
  { name: 'Malir', lat: 24.89, lng: 67.2, kmFromClifton: 19.1 },
  { name: 'Surjani Town', lat: 25.01, lng: 67.07, kmFromClifton: 22.2 },
];

/**
 * 30 test workers spread deliberately across distance bands from Clifton so
 * each radius option returns a visibly different result set:
 *   5 km  → ~10 workers   10 km → ~15   20 km → ~26   50 km → all 30
 */
const TEST_WORKERS = [
  // ── Band 1: within 5 km of Clifton (10 workers) ──
  { name: 'Imran Ali', area: 0, category: 'electrician', exp: 8, rating: 4.8, jobs: 142, charges: 500 },
  { name: 'Bilal Ahmed', area: 0, category: 'plumber', exp: 5, rating: 4.5, jobs: 87, charges: 400 },
  { name: 'Faisal Khan', area: 0, category: 'ac_technician', exp: 10, rating: 4.9, jobs: 210, charges: 800 },
  { name: 'Naveed Hussain', area: 1, category: 'carpenter', exp: 12, rating: 4.7, jobs: 178, charges: 600 },
  { name: 'Kashif Mehmood', area: 1, category: 'painter', exp: 6, rating: 4.3, jobs: 64, charges: 450 },
  { name: 'Adnan Sheikh', area: 1, category: 'electrician', exp: 3, rating: 4.1, jobs: 29, charges: 350 },
  { name: 'Rizwan Aslam', area: 2, category: 'plumber', exp: 7, rating: 4.6, jobs: 103, charges: 450 },
  { name: 'Shahid Iqbal', area: 2, category: 'home_cleaner', exp: 4, rating: 4.4, jobs: 156, charges: 300 },
  { name: 'Tariq Javed', area: 3, category: 'mason', exp: 15, rating: 4.9, jobs: 245, charges: 700 },
  { name: 'Waseem Abbas', area: 3, category: 'mechanic', exp: 9, rating: 4.5, jobs: 118, charges: 550 },

  // ── Band 2: 5–11 km (5 workers) ──
  { name: 'Zubair Malik', area: 4, category: 'electrician', exp: 11, rating: 4.7, jobs: 189, charges: 550 },
  { name: 'Asif Raza', area: 4, category: 'ac_technician', exp: 6, rating: 4.2, jobs: 71, charges: 750 },
  { name: 'Nadeem Akhtar', area: 5, category: 'carpenter', exp: 8, rating: 4.4, jobs: 95, charges: 500 },
  { name: 'Salman Yousuf', area: 6, category: 'plumber', exp: 4, rating: 4.0, jobs: 42, charges: 380 },
  { name: 'Junaid Farooq', area: 7, category: 'painter', exp: 13, rating: 4.8, jobs: 201, charges: 520 },

  // ── Band 3: 11–16 km (7 workers) ──
  { name: 'Arif Nawaz', area: 8, category: 'electrician', exp: 7, rating: 4.5, jobs: 112, charges: 480 },
  { name: 'Sajid Hameed', area: 8, category: 'home_cleaner', exp: 2, rating: 3.9, jobs: 33, charges: 280 },
  { name: 'Irfan Baig', area: 9, category: 'mason', exp: 10, rating: 4.6, jobs: 167, charges: 650 },
  { name: 'Yasir Qureshi', area: 9, category: 'mechanic', exp: 5, rating: 4.2, jobs: 58, charges: 500 },
  { name: 'Rashid Anwar', area: 10, category: 'plumber', exp: 9, rating: 4.4, jobs: 134, charges: 420 },
  { name: 'Danish Saeed', area: 11, category: 'ac_technician', exp: 12, rating: 4.7, jobs: 195, charges: 780 },
  { name: 'Umair Siddiqui', area: 11, category: 'tailoring', exp: 6, rating: 4.3, jobs: 88, charges: 350 },

  // ── Band 4: 16–23 km (8 workers) ──
  { name: 'Kamran Zafar', area: 12, category: 'carpenter', exp: 14, rating: 4.8, jobs: 223, charges: 580 },
  { name: 'Nasir Mahmood', area: 12, category: 'painter', exp: 3, rating: 4.0, jobs: 37, charges: 400 },
  { name: 'Aamir Latif', area: 13, category: 'electrician', exp: 8, rating: 4.5, jobs: 126, charges: 460 },
  { name: 'Fahad Rehman', area: 13, category: 'car_care', exp: 5, rating: 4.1, jobs: 69, charges: 600 },
  { name: 'Shoaib Akram', area: 13, category: 'pest_control', exp: 7, rating: 4.6, jobs: 91, charges: 900 },
  { name: 'Haris Munir', area: 14, category: 'home_construction', exp: 16, rating: 4.9, jobs: 258, charges: 1200 },
  { name: 'Owais Tanveer', area: 14, category: 'mason', exp: 6, rating: 4.2, jobs: 74, charges: 620 },
  { name: 'Zeeshan Haider', area: 14, category: 'home_cleaner', exp: 3, rating: 4.0, jobs: 45, charges: 320 },
];

/**
 * Seed 30 approved test workers across Karachi for exercising the
 * nearby-workers radius search. Guarded — skips entirely if test workers
 * already exist, so the seed stays safe to re-run.
 */
async function seedTestWorkers() {
  console.log('');
  console.log('👷 Seeding test workers...');

  const existing = await prisma.user.findFirst({
    where: { phoneNumber: { startsWith: '+92300000' } },
  });

  if (existing) {
    console.log('✅ Test workers already exist — skipping');
    return;
  }

  // Services were seeded above with auto-increment IDs, so look them up by
  // category rather than hardcoding.
  const allServices = await prisma.service.findMany({
    select: { id: true, categoryId: true },
  });

  const servicesByCategory = new Map<string, number[]>();
  for (const service of allServices) {
    const list = servicesByCategory.get(service.categoryId) ?? [];
    list.push(service.id);
    servicesByCategory.set(service.categoryId, list);
  }

  const hashedPassword = await bcrypt.hash('Worker123', 10);
  let created = 0;

  for (const [index, worker] of TEST_WORKERS.entries()) {
    const area = KARACHI_AREAS[worker.area];
    const serial = String(index + 1).padStart(2, '0');

    // Jitter coordinates slightly so workers in the same area aren't stacked on
    // one exact point (~±550 m).
    const jitter = () => (Math.random() - 0.5) * 0.01;

    // Give each worker up to 3 services from their category.
    const categoryServiceIds = (servicesByCategory.get(worker.category) ?? []).slice(0, 3);

    if (categoryServiceIds.length === 0) {
      console.warn(`⚠️  No services found for category "${worker.category}" — skipping ${worker.name}`);
      continue;
    }

    await prisma.user.create({
      data: {
        phoneNumber: `+923000000${serial}`,
        password: hashedPassword,
        fullName: worker.name,
        role: 'WORKER',
        isVerified: true,
        isBlocked: false,
        workerProfile: {
          create: {
            cnicNumber: `42101-${String(1000000 + index).padStart(7, '0')}-${index % 10}`,
            cnicFrontUrl: 'https://placehold.co/600x400?text=CNIC+Front',
            cnicBackUrl: 'https://placehold.co/600x400?text=CNIC+Back',
            bio: `Experienced ${worker.category.replace(/_/g, ' ')} based in ${area.name}, Karachi.`,
            experienceYears: worker.exp,
            visitingCharges: worker.charges,
            homeAddress: `${area.name}, Karachi`,
            homeLat: area.lat + jitter(),
            homeLng: area.lng + jitter(),
            city: 'Karachi',
            isOnline: index % 3 !== 0, // ~two thirds online
            verificationStatus: 'APPROVED', // required — search filters on this
            averageRating: worker.rating,
            totalJobsCompleted: worker.jobs,
            services: {
              create: categoryServiceIds.map((serviceId) => ({
                serviceId,
                price: worker.charges + Math.floor(Math.random() * 300),
              })),
            },
          },
        },
      },
    });

    created++;
    console.log(`✅ ${worker.name} — ${area.name} (~${area.kmFromClifton} km from Clifton)`);
  }

  console.log(`👷 Seeded ${created} test workers (password: Worker123)`);
}

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

  // Workers link to services, so this must run after the service seed above.
  await seedTestWorkers();

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
