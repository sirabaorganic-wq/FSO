/**
 * Siraba Organic — Product + Demo Vendor Seed Script
 * Run with:  node seedProducts.js
 * Re-runnable: deletes only seeded slugs before re-inserting.
 */

const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
dotenv.config();

const connectDB = require('./config/db');
const Product = require('./models/Product');
const Vendor = require('./models/Vendor');

// ─────────────────────────────────────────────
//  Picsum photo IDs for organic-looking images
// ─────────────────────────────────────────────
const img = (id) => `https://picsum.photos/seed/${id}/600/600`;

const VENDOR_EMAIL = 'vendor-demo@sirabafarm.com';
const VENDOR_SLUG  = 'green-harvest-farms';

// ─────────────────────────────────────────────
//  Platform / Admin products (no vendor)
// ─────────────────────────────────────────────
const adminProducts = [
  {
    name: 'Kashmiri Mongra Saffron',
    slug: 'kashmiri-mongra-saffron',
    description: 'Grade A1 Premium Organic Saffron. Hand-harvested from the fields of Pampore.',
    fullDescription:
      'Our Kashmiri Mongra Saffron is the finest quality available. Distinguished by its dark red colour and long, thick stigmas. Sourced directly from the heritage fields of Pampore, Kashmir. Every strand is hand-picked and verified with accredited lab evidence for authenticity.',
    price: 499,
    image: img('saffron-1'),
    images: [img('saffron-1'), img('saffron-2'), img('saffron-3')],
    tag: 'Best Seller',
    category: 'Spices',
    features: ['100% Organic', 'Hand Picked', 'Accredited Lab Evidence', 'GI Tagged'],
    ingredients: '100% Pure Crocus Sativus Stigmas',
    rating: 4.9,
    numReviews: 128,
    stockQuantity: 150,
    certifications: ['NPOP'],
    options: [
      { label: '1g', price: 499 },
      { label: '2g', price: 899 },
      { label: '5g', price: 1999 },
    ],
  },
  {
    name: 'Premium Asafoetida (Hing)',
    slug: 'premium-asafoetida-hing',
    description: 'Strong, aromatic, and pure compounded Asafoetida. Essential for authentic Indian cuisine.',
    fullDescription:
      'Experience the robust and pungent aroma of our Premium Asafoetida. Sourced from high-altitude deserts and carefully compounded. No artificial fillers — just pure, potent Hing.',
    price: 249,
    image: img('hing-1'),
    images: [img('hing-1'), img('hing-2')],
    tag: 'Essential',
    category: 'Spices',
    features: ['Strong Aroma', 'Digestive Aid', 'No Artificial Fillers'],
    ingredients: 'Edible Gum, Wheat Flour, Asafoetida',
    rating: 4.7,
    numReviews: 94,
    stockQuantity: 300,
    certifications: [],
    options: [
      { label: '50g', price: 249 },
      { label: '100g', price: 449 },
      { label: '250g', price: 999 },
    ],
  },
  {
    name: 'Himalayan Pink Salt',
    slug: 'himalayan-pink-salt',
    description: 'Mineral-rich rock salt (Sendha Namak) with 84+ trace minerals.',
    fullDescription:
      'Pure crystalline Pink Salt mined from the Himalayan foothills. Contains 84+ minerals and trace elements. No additives, no bleaching — just pure nature.',
    price: 149,
    image: img('salt-pink-1'),
    images: [img('salt-pink-1'), img('salt-pink-2')],
    tag: 'Essential',
    category: 'Pantry',
    features: ['Unrefined', 'Rich Mineral Profile', 'Keto Friendly'],
    ingredients: 'Rock Salt',
    rating: 4.8,
    numReviews: 210,
    stockQuantity: 500,
    certifications: [],
    options: [
      { label: '250g', price: 149 },
      { label: '500g', price: 269 },
      { label: '1kg', price: 499 },
    ],
  },
  {
    name: 'Organic Turmeric Powder',
    slug: 'organic-turmeric-powder',
    description: 'High curcumin content turmeric with vibrant colour and earthy aroma.',
    fullDescription:
      'Our Organic Turmeric is stone-ground from heritage variety roots known for 4–6% curcumin content. Vibrant golden-yellow colour guaranteed.',
    price: 199,
    image: img('turmeric-1'),
    images: [img('turmeric-1'), img('turmeric-2')],
    tag: 'Trending',
    category: 'Spices',
    features: ['High Curcumin', 'Vibrant Colour', 'Anti-Inflammatory'],
    ingredients: '100% Organic Turmeric Root',
    rating: 4.6,
    numReviews: 180,
    stockQuantity: 400,
    certifications: ['NPOP'],
    options: [
      { label: '100g', price: 199 },
      { label: '250g', price: 449 },
      { label: '500g', price: 849 },
    ],
  },
  {
    name: 'Desi Ghee (A2 Bilona)',
    slug: 'desi-ghee-a2-bilona',
    description: 'Traditional Bilona churned A2 Cow Ghee. Grainy, fragrant, and pure.',
    fullDescription:
      'Made from the milk of free-grazing indigenous Gir cows using the traditional wooden churn method. Slow-cooked over open flame for the perfect grainy texture and nutty aroma.',
    price: 999,
    image: img('ghee-1'),
    images: [img('ghee-1'), img('ghee-2'), img('ghee-3')],
    tag: 'Premium',
    category: 'Pantry',
    features: ['Vedic Method', 'A2 Protein', 'Grainy Texture'],
    ingredients: 'Cultured Cow Milk Fat',
    rating: 4.9,
    numReviews: 75,
    stockQuantity: 120,
    certifications: [],
    options: [
      { label: '250ml', price: 999 },
      { label: '500ml', price: 1799 },
      { label: '1L', price: 3299 },
    ],
  },
  {
    name: 'Green Cardamom (Elaichi)',
    slug: 'green-cardamom-elaichi',
    description: 'Large 8mm+ pods with intense fragrance from the gardens of Idukki.',
    fullDescription:
      'Handpicked extra-bold Green Cardamom pods from the spice gardens of Kerala. Fresh crop, packed within days of harvest to preserve volatile oils.',
    price: 699,
    image: img('cardamom-1'),
    images: [img('cardamom-1'), img('cardamom-2')],
    tag: 'Premium',
    category: 'Spices',
    features: ['8mm+ Bold Pods', 'Fresh Crop', 'Aromatic Seeds'],
    ingredients: 'Whole Green Cardamom',
    rating: 4.9,
    numReviews: 60,
    stockQuantity: 200,
    certifications: [],
    options: [
      { label: '50g', price: 699 },
      { label: '100g', price: 1299 },
      { label: '250g', price: 2999 },
    ],
  },
  {
    name: 'Organic Chia Seeds',
    slug: 'organic-chia-seeds',
    description: 'Superfood seeds rich in Omega-3 and fibre.',
    fullDescription:
      'Raw organic Chia Seeds perfect for puddings, smoothies, and salads. A powerhouse of plant-based nutrition — 11g fibre per 28g serving.',
    price: 299,
    image: img('chia-1'),
    images: [img('chia-1'), img('chia-2')],
    tag: 'Superfood',
    category: 'Wellness',
    features: ['Vegan', 'Gluten Free', 'Keto Friendly'],
    ingredients: 'Chia Seeds',
    rating: 4.5,
    numReviews: 90,
    stockQuantity: 350,
    certifications: ['USDA Organic'],
    options: [
      { label: '200g', price: 299 },
      { label: '500g', price: 649 },
      { label: '1kg', price: 1199 },
    ],
  },
  {
    name: 'Ceylon Cinnamon Sticks',
    slug: 'ceylon-cinnamon-sticks',
    description: 'True Ceylon cinnamon — sweet, delicate, and low in coumarin.',
    fullDescription:
      'Genuine Ceylon Cinnamon (not Cassia) with paper-thin bark, subtle sweetness, and a complex flavour profile. Safe for daily consumption.',
    price: 349,
    image: img('cinnamon-1'),
    images: [img('cinnamon-1'), img('cinnamon-2')],
    tag: 'Wellness',
    category: 'Spices',
    features: ['True Ceylon', 'Low Coumarin', 'Sweet Aroma'],
    ingredients: 'Cinnamon Bark',
    rating: 4.6,
    numReviews: 42,
    stockQuantity: 220,
    certifications: [],
    options: [
      { label: '50g', price: 349 },
      { label: '100g', price: 649 },
      { label: '200g', price: 1199 },
    ],
  },
  {
    name: 'Royal Cumin Seeds',
    slug: 'royal-cumin-seeds',
    description: 'Organic Jeera with a bold aroma and nutty flavour.',
    fullDescription:
      'Our Royal Cumin Seeds are triple-sorted and cleaned to ensure zero dust or stones. Adds a distinct flavour to tadkas and biryanis.',
    price: 199,
    image: img('cumin-1'),
    images: [img('cumin-1'), img('cumin-2')],
    tag: 'Essential',
    category: 'Spices',
    features: ['Clean & Sorted', 'Bold Aroma', 'Digestive Aid'],
    ingredients: 'Cumin Seeds',
    rating: 4.7,
    numReviews: 110,
    stockQuantity: 450,
    certifications: ['NPOP'],
    options: [
      { label: '100g', price: 199 },
      { label: '250g', price: 449 },
      { label: '500g', price: 849 },
    ],
  },
  {
    name: 'Organic White Honey (Raw)',
    slug: 'organic-white-honey-raw',
    description: 'Rare single-origin white honey from the Kashmir valley. Unprocessed.',
    fullDescription:
      'Single-origin white honey derived from the Plectranthus Rugosus flower blooming at 10,000 ft. Naturally crystallises — a sign of purity, not spoilage.',
    price: 699,
    image: img('honey-1'),
    images: [img('honey-1'), img('honey-2'), img('honey-3')],
    tag: 'Premium',
    category: 'Honey',
    features: ['Raw & Unprocessed', 'Crystallises Naturally', 'High Enzymes'],
    ingredients: 'Raw Honey',
    rating: 5,
    numReviews: 55,
    stockQuantity: 100,
    certifications: ['NPOP'],
    options: [
      { label: '250g', price: 699 },
      { label: '500g', price: 1249 },
      { label: '1kg', price: 2299 },
    ],
  },
];

// ─────────────────────────────────────────────
//  Vendor products (linked to demo vendor)
// ─────────────────────────────────────────────
const vendorProductTemplates = [
  {
    name: 'Kashmiri Mamra Almonds',
    slug: 'kashmiri-mamra-almonds-ghf',
    description: 'Oil-rich, sweet, and crunchy almonds with a natural concave shape.',
    fullDescription:
      'Mamra Almonds are the most premium variety of almonds, grown organically in the valleys of Kashmir. Rich in natural oils and vitamins. Non-GMO and cold-pressed clean.',
    price: 799,
    image: img('almonds-1'),
    images: [img('almonds-1'), img('almonds-2')],
    tag: 'Premium',
    category: 'Dry Fruits',
    features: ['High Oil Content', 'Crunchy Texture', 'Heart Healthy'],
    ingredients: 'Whole Almond Kernels',
    rating: 4.8,
    numReviews: 72,
    stockQuantity: 180,
    certifications: ['NPOP'],
    options: [
      { label: '250g', price: 799 },
      { label: '500g', price: 1449 },
      { label: '1kg', price: 2699 },
    ],
  },
  {
    name: 'Snow White Walnuts',
    slug: 'snow-white-walnuts-ghf',
    description: 'Premium large walnut kernels with no bitterness — crisp and sweet.',
    fullDescription:
      'Kashmiri Snow White Walnuts are known for their soft texture and unique sweet taste. Vacuum packed for freshness. Rich in Omega-3 fatty acids.',
    price: 649,
    image: img('walnuts-1'),
    images: [img('walnuts-1'), img('walnuts-2')],
    tag: 'Best Seller',
    category: 'Dry Fruits',
    features: ['Omega-3 Rich', 'Brain Food', 'Vacuum Packed'],
    ingredients: 'Walnut Kernels',
    rating: 4.8,
    numReviews: 38,
    stockQuantity: 250,
    certifications: ['NPOP'],
    options: [
      { label: '200g', price: 649 },
      { label: '500g', price: 1449 },
      { label: '1kg', price: 2699 },
    ],
  },
  {
    name: 'Afghan Dried Figs (Anjeer)',
    slug: 'afghan-dried-figs-ghf',
    description: 'Large, sweet, and chewy dried figs. A nutrient-dense natural snack.',
    fullDescription:
      'Premium quality Afghan figs washed and naturally dried. Loaded with fibre, iron, and calcium. No added sugar or preservatives.',
    price: 549,
    image: img('figs-1'),
    images: [img('figs-1'), img('figs-2')],
    tag: 'Healthy Snack',
    category: 'Dry Fruits',
    features: ['High Fibre', 'No Added Sugar', 'Soft Texture'],
    ingredients: 'Dried Figs',
    rating: 4.6,
    numReviews: 29,
    stockQuantity: 160,
    certifications: [],
    options: [
      { label: '250g', price: 549 },
      { label: '500g', price: 999 },
      { label: '1kg', price: 1799 },
    ],
  },
  {
    name: 'Cold Pressed Coconut Oil',
    slug: 'cold-pressed-coconut-oil-ghf',
    description: 'Unrefined virgin coconut oil cold-pressed from fresh coconuts.',
    fullDescription:
      'Our Virgin Coconut Oil is cold-pressed within 4 hours of de-husking to preserve natural nutrition. No heat, no chemicals — just pure coconut goodness.',
    price: 449,
    image: img('coconut-oil-1'),
    images: [img('coconut-oil-1'), img('coconut-oil-2')],
    tag: 'Cold Pressed',
    category: 'Oils',
    features: ['Extra Virgin', 'Cold Pressed', 'No Refining'],
    ingredients: 'Fresh Coconut Meat',
    rating: 4.7,
    numReviews: 88,
    stockQuantity: 200,
    certifications: ['USDA Organic', 'NPOP'],
    options: [
      { label: '250ml', price: 449 },
      { label: '500ml', price: 849 },
      { label: '1L', price: 1549 },
    ],
  },
  {
    name: 'Black Seed Oil (Kalonji)',
    slug: 'black-seed-oil-kalonji-ghf',
    description: 'First cold press Nigella Sativa oil. A remedy for everything but death.',
    fullDescription:
      'Our Black Seed Oil is made by single cold-pressing Nigella Sativa seeds. Rich in Thymoquinone — the active compound with powerful antioxidant properties.',
    price: 599,
    image: img('blackseed-1'),
    images: [img('blackseed-1'), img('blackseed-2')],
    tag: 'Medicinal',
    category: 'Oils',
    features: ['First Press', 'High Thymoquinone', 'Antioxidant Rich'],
    ingredients: 'Black Seed (Nigella Sativa)',
    rating: 4.8,
    numReviews: 44,
    stockQuantity: 130,
    certifications: ['NPOP'],
    options: [
      { label: '100ml', price: 599 },
      { label: '250ml', price: 1299 },
      { label: '500ml', price: 2399 },
    ],
  },
  {
    name: 'Organic Flaxseeds',
    slug: 'organic-flaxseeds-ghf',
    description: 'Golden flaxseeds — a daily superfood for gut health and Omega-3.',
    fullDescription:
      'Lightly cleaned golden flaxseeds with a nutty flavour. Grind and add to rotis, smoothies, or salads. A cornerstone of gut health.',
    price: 179,
    image: img('flax-1'),
    images: [img('flax-1'), img('flax-2')],
    tag: 'Superfood',
    category: 'Wellness',
    features: ['High Fibre', 'Omega-3 ALA', 'Gluten Free'],
    ingredients: 'Flax Seeds',
    rating: 4.4,
    numReviews: 63,
    stockQuantity: 400,
    certifications: [],
    options: [
      { label: '200g', price: 179 },
      { label: '500g', price: 399 },
      { label: '1kg', price: 749 },
    ],
  },
  {
    name: 'Dried Apricots (Jardalu)',
    slug: 'dried-apricots-jardalu-ghf',
    description: 'Sweet and tangy sun-dried apricots — rich in Vitamin A.',
    fullDescription:
      'Naturally sun-dried apricots from Gilgit with their skin intact. A chewy, nutrient-dense treat. No sulphur dioxide, no sugar coating.',
    price: 499,
    image: img('apricots-1'),
    images: [img('apricots-1'), img('apricots-2')],
    tag: 'Natural',
    category: 'Dry Fruits',
    features: ['Sun Dried', 'Rich in Vitamin A', 'Natural Sweetness'],
    ingredients: 'Apricot Fruit',
    rating: 4.6,
    numReviews: 36,
    stockQuantity: 190,
    certifications: [],
    options: [
      { label: '200g', price: 499 },
      { label: '500g', price: 1099 },
      { label: '1kg', price: 1999 },
    ],
  },
  {
    name: 'Himalayan Shilajit Resin',
    slug: 'himalayan-shilajit-resin-ghf',
    description: 'Pure mineral-rich soft resin from 16,000 ft. Supports vitality.',
    fullDescription:
      'Harvested from the pristine heights of the Himalayas, our Shilajit Resin is a natural powerhouse of fulvic acid and over 80 trace minerals. Verified with accredited laboratory evidence for safety.',
    price: 1299,
    image: img('shilajit-1'),
    images: [img('shilajit-1'), img('shilajit-2')],
    tag: 'Trending',
    category: 'Wellness',
    features: ['Rich in Fulvic Acid', 'High Altitude Source', 'Accredited Lab Evidence'],
    ingredients: 'Pure Shilajit Resin',
    rating: 4.9,
    numReviews: 51,
    stockQuantity: 80,
    certifications: [],
    options: [
      { label: '20g', price: 1299 },
      { label: '40g', price: 2299 },
      { label: '100g', price: 4999 },
    ],
  },
  {
    name: 'Organic Quinoa (White)',
    slug: 'organic-quinoa-white-ghf',
    description: 'Protein-rich grain substitute. Pre-washed, saponin-free.',
    fullDescription:
      'Saponin-free pre-washed Organic White Quinoa. The perfect healthy replacement for rice or pasta. Complete protein with all 9 essential amino acids.',
    price: 329,
    image: img('quinoa-1'),
    images: [img('quinoa-1'), img('quinoa-2')],
    tag: 'Healthy',
    category: 'Grains',
    features: ['Complete Protein', 'Low GI', 'Fluffy Texture'],
    ingredients: 'White Quinoa',
    rating: 4.5,
    numReviews: 47,
    stockQuantity: 310,
    certifications: ['USDA Organic'],
    options: [
      { label: '300g', price: 329 },
      { label: '750g', price: 749 },
      { label: '1.5kg', price: 1399 },
    ],
  },
  {
    name: 'Moringa Leaf Powder',
    slug: 'moringa-leaf-powder-ghf',
    description: 'The miracle tree powder. High iron, calcium, and vitamin C.',
    fullDescription:
      'Drum-dried Moringa Oleifera leaf powder from organic farms in Rajasthan. Gentle drying preserves maximum nutrients. Mix with water, smoothies, or curries.',
    price: 399,
    image: img('moringa-1'),
    images: [img('moringa-1'), img('moringa-2')],
    tag: 'Superfood',
    category: 'Wellness',
    features: ['High Iron', 'Vitamin C', 'All-Natural'],
    ingredients: '100% Moringa Leaf',
    rating: 4.6,
    numReviews: 68,
    stockQuantity: 270,
    certifications: ['USDA Organic', 'NPOP'],
    options: [
      { label: '100g', price: 399 },
      { label: '250g', price: 899 },
      { label: '500g', price: 1649 },
    ],
  },
];

// ─────────────────────────────────────────────
//  Main seed function
// ─────────────────────────────────────────────
const seed = async () => {
  try {
    await connectDB();
    console.log('📦 Connected to DB');

    // ── 1. Create / find demo vendor ──────────────────
    let vendor = await Vendor.findOne({ email: VENDOR_EMAIL });

    if (!vendor) {
      const hashedPwd = await bcrypt.hash('VendorPass123!', 10);
      vendor = await Vendor.create({
        email: VENDOR_EMAIL,
        password: hashedPwd,
        businessName: 'Green Harvest Farms',
        businessType: 'farmer',
        businessDescription:
          'A family-run organic farm from the foothills of Himachal Pradesh, certified by NPOP since 2018. We grow, process, and ship directly to you.',
        contactPerson: 'Arjun Thakur',
        phone: '+91-98765-43210',
        address: {
          street: '12, Orchard Lane',
          city: 'Shimla',
          state: 'Himachal Pradesh',
          postalCode: '171001',
          country: 'India',
        },
        status: 'approved',
        isEmailVerified: true,
        onboardingComplete: true,
        certifications: ['NPOP', 'USDA Organic'],
        certificationsVerified: true,
        allowedCategories: ['Dry Fruits', 'Oils', 'Wellness', 'Grains'],
        shopSettings: {
          shopName: 'Green Harvest Farms',
          shopSlug: VENDOR_SLUG,
          tagline: 'From our fields to your family — always organic.',
          shopDescription:
            'We are a certified organic farm bringing you the finest dry fruits, cold-pressed oils, and wellness superfoods straight from nature.',
          isPublished: true,
        },
      });
      console.log(`✅ Created vendor: ${vendor.businessName} (${vendor.email})`);
    } else {
      console.log(`⚡ Vendor already exists: ${vendor.businessName}`);
    }

    // ── 2. Clear previous seeds (by slug suffix) ──────
    const allSlugs = [
      ...adminProducts.map((p) => p.slug),
      ...vendorProductTemplates.map((p) => p.slug),
    ];
    const deleted = await Product.deleteMany({ slug: { $in: allSlugs } });
    console.log(`🧹 Removed ${deleted.deletedCount} stale seed products`);

    // ── 3. Insert admin / platform products ───────────
    const adminDocs = adminProducts.map((p) => ({
      ...p,
      isVendorProduct: false,
      vendor: null,
      vendorStatus: 'approved',
      isActive: true,
      isPublic: true,
    }));
    const createdAdmin = await Product.insertMany(adminDocs);
    console.log(`✅ Inserted ${createdAdmin.length} platform products`);

    // ── 4. Insert vendor products ─────────────────────
    const vendorDocs = vendorProductTemplates.map((p) => ({
      ...p,
      isVendorProduct: true,
      vendor: vendor._id,
      vendorStatus: 'approved',
      isActive: true,
      isPublic: true,
    }));
    const createdVendor = await Product.insertMany(vendorDocs);
    console.log(`✅ Inserted ${createdVendor.length} vendor products for "${vendor.businessName}"`);

    console.log('\n🎉 Seeding complete!');
    console.log(`   Total products: ${createdAdmin.length + createdVendor.length}`);
    console.log(`   Demo vendor login: ${VENDOR_EMAIL} / VendorPass123!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
