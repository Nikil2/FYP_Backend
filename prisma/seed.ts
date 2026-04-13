import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const servicesData = [
  // ============================================
  // 1. ELECTRICIAN - 6 Services
  // ============================================
  { name: 'Wiring & Rewiring', icon: '⚡' },
  { name: 'Switch & Socket Repair', icon: '🔌' },
  { name: 'Fan Installation & Repair', icon: '💨' },
  { name: 'Light Fitting Installation', icon: '💡' },
  { name: 'Circuit Breaker & DB Board', icon: '🔋' },
  { name: 'UPS & Inverter Installation', icon: '🔌' },

  // ============================================
  // 2. PLUMBER - 6 Services
  // ============================================
  { name: 'Leak Repair', icon: '💧' },
  { name: 'Pipe Installation', icon: '🔧' },
  { name: 'Tap & Faucet Repair', icon: '🚰' },
  { name: 'Toilet Repair', icon: '🚽' },
  { name: 'Drain Cleaning', icon: '🌊' },
  { name: 'Geyser Installation', icon: '🔥' },

  // ============================================
  // 3. CARPENTER - 5 Services
  // ============================================
  { name: 'Door Repair & Installation', icon: '🚪' },
  { name: 'Cabinet Making', icon: '📦' },
  { name: 'Furniture Repair', icon: '🪑' },
  { name: 'Shelf Installation', icon: '📚' },
  { name: 'Wood Polishing', icon: '✨' },

  // ============================================
  // 4. PAINTER - 5 Services
  // ============================================
  { name: 'Wall Painting', icon: '🎨' },
  { name: 'Exterior Painting', icon: '🏠' },
  { name: 'Wood Painting & Polish', icon: '🪵' },
  { name: 'Waterproofing', icon: '🌧️' },
  { name: 'Texture & Design Work', icon: '🎭' },

  // ============================================
  // 5. AC TECHNICIAN - 5 Services
  // ============================================
  { name: 'AC Installation', icon: '❄️' },
  { name: 'AC Repair', icon: '🔧' },
  { name: 'AC General Service', icon: '🌬️' },
  { name: 'Gas Refilling', icon: '⛽' },
  { name: 'AC Deep Cleaning', icon: '✨' },

  // ============================================
  // 6. MASON - 5 Services
  // ============================================
  { name: 'Wall Construction', icon: '🧱' },
  { name: 'Tile Work', icon: '🟫' },
  { name: 'Plastering', icon: '🎨' },
  { name: 'Flooring', icon: '⬜' },
  { name: 'Demolition Work', icon: '💥' },

  // ============================================
  // 7. MECHANIC - 5 Services
  // ============================================
  { name: 'Bike Repair', icon: '🏍️' },
  { name: 'Car Repair', icon: '🚗' },
  { name: 'Oil Change', icon: '🛢️' },
  { name: 'Tire Puncture & Change', icon: '🛞' },
  { name: 'Battery Service', icon: '🔋' },

  // ============================================
  // 8. HOME CLEANER - 5 Services
  // ============================================
  { name: 'Full Home Cleaning', icon: '🧹' },
  { name: 'Kitchen Deep Clean', icon: '🍳' },
  { name: 'Bathroom Cleaning', icon: '🚿' },
  { name: 'Sofa & Carpet Cleaning', icon: '🛋️' },
  { name: 'Water Tank Cleaning', icon: '💧' },

  // ============================================
  // 9. TAILORING - 3 Services
  // ============================================
  { name: 'Ladies Tailoring', icon: '👗' },
  { name: 'Gents Tailoring', icon: '👔' },
  { name: 'Alterations & Repairs', icon: '🧵' },

  // ============================================
  // 10. CAR CARE - 4 Services
  // ============================================
  { name: 'Car Wash', icon: '🚗' },
  { name: 'Car Maintenance', icon: '🔧' },
  { name: 'Tire & Puncture Service', icon: '🛞' },
  { name: 'Car Interior Cleaning', icon: '🧹' },

  // ============================================
  // 11. HOME CONSTRUCTION - 4 Services
  // ============================================
  { name: 'Mason & Tile Work', icon: '🧱' },
  { name: 'Carpenter Services', icon: '🪵' },
  { name: 'Painter Services', icon: '🎨' },
  { name: 'Welding & Iron Work', icon: '⚙️' },

  // ============================================
  // 12. PEST CONTROL - 1 Service
  // ============================================
  { name: 'Pest Control', icon: '🐜' },
];

async function main() {
  console.log('🌱 Starting seed with 43 comprehensive services...');

  for (const service of servicesData) {
    const created = await prisma.service.upsert({
      where: { name: service.name },
      update: {},
      create: {
        name: service.name,
        iconUrl: service.icon,
        isActive: true,
      },
    });
    console.log(`✅ ${created.name} (ID: ${created.id})`);
  }

  console.log('✨ Seeding finished successfully!');
  console.log(`📊 Total services seeded: ${servicesData.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
