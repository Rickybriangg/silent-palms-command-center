import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Silent Palms Command Center...');

  // Roles
  const roles = await Promise.all([
    prisma.role.upsert({ where: { name: 'SUPER_ADMIN' }, update: {}, create: { name: 'SUPER_ADMIN', permissions: JSON.stringify({ all: true }) } }),
    prisma.role.upsert({ where: { name: 'MARKETING_ADMIN' }, update: {}, create: { name: 'MARKETING_ADMIN', permissions: JSON.stringify({ marketing: true, analytics: true }) } }),
    prisma.role.upsert({ where: { name: 'GUEST_RELATIONS' }, update: {}, create: { name: 'GUEST_RELATIONS', permissions: JSON.stringify({ guests: true, bookings: true, whatsapp: true }) } }),
    prisma.role.upsert({ where: { name: 'PROPERTY_MANAGER' }, update: {}, create: { name: 'PROPERTY_MANAGER', permissions: JSON.stringify({ bookings: true, tasks: true }) } }),
    prisma.role.upsert({ where: { name: 'FINANCE_MANAGER' }, update: {}, create: { name: 'FINANCE_MANAGER', permissions: JSON.stringify({ revenue: true, reports: true }) } }),
  ]);

  // Admin user
  await prisma.user.upsert({
    where: { email: 'admin@silentpalms.com' },
    update: {},
    create: {
      email: 'admin@silentpalms.com',
      passwordHash: await bcrypt.hash('Admin@SilentPalms2024', 12),
      firstName: 'Admin',
      lastName: 'User',
      roleId: roles[0].id,
    },
  });

  // Property
  const property = await prisma.property.upsert({
    where: { id: 'silent-palms-villa' },
    update: {},
    create: {
      id: 'silent-palms-villa',
      name: 'Silent Palms Villa',
      description: 'Luxury beachfront villa nestled among palm trees on Diani Beach, Kenya',
      address: 'Diani Beach Road',
      city: 'Diani Beach',
      country: 'Kenya',
      coordinates: JSON.stringify({ lat: -4.3167, lng: 39.5697 }),
      amenities: JSON.stringify(['Private Pool', 'Beachfront', 'WiFi', 'Air Conditioning', 'Full Kitchen', 'Housekeeper', 'Chef', 'Garden', 'Parking']),
    },
  });

  // Units
  await prisma.unit.upsert({
    where: { id: 'whole-villa' },
    update: {},
    create: {
      id: 'whole-villa',
      propertyId: property.id,
      name: 'Whole Villa',
      type: 'WHOLE_VILLA',
      description: 'The entire Silent Palms Villa — 4 bedrooms, private pool, full beachfront access',
      maxGuests: 8,
      bedrooms: 4,
      bathrooms: 4,
      basePrice: 500,
      amenities: JSON.stringify(['Private Pool', 'Beachfront', 'Full Villa', '4 Bedrooms']),
    },
  });

  await prisma.unit.upsert({
    where: { id: 'two-bedroom' },
    update: {},
    create: {
      id: 'two-bedroom',
      propertyId: property.id,
      name: '2-Bedroom Unit',
      type: 'TWO_BEDROOM',
      description: 'Private 2-bedroom unit with ocean views and pool access',
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 2,
      basePrice: 280,
      amenities: JSON.stringify(['Pool Access', 'Ocean View', '2 Bedrooms']),
    },
  });

  // WhatsApp Templates
  const templates = [
    { name: 'Enquiry Response', slug: '/enquiry', category: 'Sales', body: 'Hello! 🌴 Thank you for your interest in Silent Palms Villa. We\'d love to host you at our luxury beachfront property in Diani Beach, Kenya.\n\nCould you share your preferred dates and number of guests? I\'ll prepare a personalised quote for you right away!' },
    { name: 'Booking Confirmation', slug: '/book', category: 'Booking', body: 'Hello {{name}}! 🎉 Your booking at Silent Palms Villa is CONFIRMED!\n\n📅 Check-in: {{checkIn}}\n📅 Check-out: {{checkOut}}\n🏡 Unit: {{unit}}\n\nWe\'re so excited to welcome you. I\'ll be in touch with arrival details closer to your stay.' },
    { name: 'Arrival Information', slug: '/arrival', category: 'Arrival', body: 'Hello {{name}}! 🌴 We\'re so excited — you arrive tomorrow!\n\n🏠 Check-in: After 2pm\n📍 Address: Diani Beach Road (I\'ll send the precise pin)\n🔑 Your dedicated host will meet you on arrival\n\nSafe travels! See you tomorrow 🌊' },
    { name: 'Welfare Check', slug: '/settled', category: 'In-Stay', body: 'Hello {{name}}! 😊 Just checking in — hope you\'re settled in and loving Silent Palms!\n\nIs everything to your satisfaction? Any special requests or anything we can do to make your stay even more perfect?' },
    { name: 'Upsell Offer', slug: '/upsell', category: 'Upsell', body: 'Hello {{name}}! 🌺 Midway through your magical stay — hope you\'re having an amazing time!\n\nWould you like to add any of our premium experiences?\n\n🍽️ Private chef dinner\n🚤 Dhow boat sunset cruise\n🏊 Pool float & welcome cocktails\n💆 Beachside spa massage\n\nJust say the word!' },
    { name: 'Checkout Message', slug: '/checkout', category: 'Checkout', body: 'Hello {{name}}! 👋 Today\'s your check-out day — we hope it\'s been absolutely magical!\n\n⏰ Checkout is by 10am\n🧳 Our team will assist with luggage\n🚗 Need airport transfer? Let me know!\n\nThank you so much for choosing Silent Palms 🌴❤️' },
    { name: 'Review Request', slug: '/review', category: 'Post-Stay', body: 'Hello {{name}}! 🌟 Thank you so much for staying at Silent Palms Villa!\n\nWe absolutely loved hosting you. If you have a moment, we\'d be incredibly grateful if you could share your experience on Airbnb/Google — it means the world to us.\n\nWe can\'t wait to welcome you back! 🌴' },
    { name: 'Repeat Guest', slug: '/repeat', category: 'Loyalty', body: 'Hello {{name}}! 🎊 Welcome back to the Silent Palms family!\n\nAs one of our cherished returning guests, you\'ll enjoy our loyalty discount on your next booking. Would you like me to check availability for your preferred dates?' },
  ];

  for (const t of templates) {
    await prisma.whatsAppTemplate.upsert({
      where: { slug: t.slug },
      update: {},
      create: { ...t, variables: JSON.stringify(['name', 'checkIn', 'checkOut', 'unit']) },
    });
  }

  console.log('Seed complete!');
  console.log('Login: admin@silentpalms.com / Admin@SilentPalms2024');
}

main().catch(console.error).finally(() => prisma.$disconnect());
