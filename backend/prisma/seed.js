/**
 * FSO Neon PostgreSQL Database Seed Script
 *
 * Populates clean, clearly labeled development and demo data:
 * - FSO Administrator account
 * - Sample Heritage Producers (Artisans, Cooperatives, Traditional Farmers)
 * - Standard Product Categories
 * - Heritage Products with regional provenance details
 * - Editorial Articles ("Kitchen Wisdom")
 * - Heritage Recipes linked to products & ingredients
 * - Heritage Ingredients Knowledge Base
 * - Curated Product Collections
 * - Homepage Banners
 *
 * NO production customer/order data is copied.
 * NO fake customer reviews are created.
 */

const { PrismaClient, Role, BusinessType, ProducerType, RecipeDifficulty } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting FSO Neon PostgreSQL Database Seed...\n");

  // 1. Clean existing demo data in reverse relation order
  console.log("1. Cleaning previous seed records...");
  await prisma.articleProduct.deleteMany().catch(() => {});
  await prisma.articleRecipe.deleteMany().catch(() => {});
  await prisma.articleProducer.deleteMany().catch(() => {});
  await prisma.recipeProduct.deleteMany().catch(() => {});
  await prisma.recipeIngredient.deleteMany().catch(() => {});
  await prisma.ingredientProduct.deleteMany().catch(() => {});
  await prisma.collectionProduct.deleteMany().catch(() => {});

  await prisma.cartItem.deleteMany().catch(() => {});
  await prisma.orderItem.deleteMany().catch(() => {});
  await prisma.vendorOrder.deleteMany().catch(() => {});
  await prisma.payment.deleteMany().catch(() => {});
  await prisma.order.deleteMany().catch(() => {});
  await prisma.cart.deleteMany().catch(() => {});
  await prisma.review.deleteMany().catch(() => {});

  await prisma.article.deleteMany().catch(() => {});
  await prisma.recipe.deleteMany().catch(() => {});
  await prisma.ingredient.deleteMany().catch(() => {});
  await prisma.collection.deleteMany().catch(() => {});
  await prisma.banner.deleteMany().catch(() => {});

  await prisma.product.deleteMany().catch(() => {});
  await prisma.category.deleteMany().catch(() => {});
  await prisma.vendorAdminNote.deleteMany().catch(() => {});
  await prisma.vendorVerificationBadge.deleteMany().catch(() => {});
  await prisma.vendor.deleteMany().catch(() => {});
  await prisma.user.deleteMany({ where: { email: { in: ["admin@fso.in", "editor@fso.in", "demo_customer@fso.in"] } } }).catch(() => {});

  // 2. Seed FSO Admin & Staff Users
  console.log("2. Creating FSO Admin & Staff Users...");
  const adminPasswordHash = await bcrypt.hash("FSO_Admin_2026!", 10);
  const adminUser = await prisma.user.create({
    data: {
      name: "FSO Super Administrator",
      email: "admin@fso.in",
      password: adminPasswordHash,
      isAdmin: true,
      role: Role.ADMIN,
      isEmailVerified: true,
      isPhoneVerified: true,
      phone: "+91 9876543210",
    },
  });

  const editorPasswordHash = await bcrypt.hash("FSO_Editor_2026!", 10);
  const editorUser = await prisma.user.create({
    data: {
      name: "Heritage Culinary Editor",
      email: "editor@fso.in",
      password: editorPasswordHash,
      isAdmin: false,
      role: Role.CONTENT_EDITOR,
      isEmailVerified: true,
      phone: "+91 9876543211",
    },
  });

  const customerPasswordHash = await bcrypt.hash("Customer_2026!", 10);
  await prisma.user.create({
    data: {
      name: "Priya Sharma (Demo Customer)",
      email: "demo_customer@fso.in",
      password: customerPasswordHash,
      isAdmin: false,
      role: Role.CUSTOMER,
      isEmailVerified: true,
      phone: "+91 9876543212",
      addresses: [
        {
          name: "Priya Sharma",
          street: "42 Indiranagar 100ft Road",
          city: "Bengaluru",
          state: "Karnataka",
          postalCode: "560038",
          country: "India",
          phone: "+91 9876543212",
          isDefault: true,
        },
      ],
    },
  });

  // 3. Seed Categories
  console.log("3. Creating Categories...");
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Herbs & Tisanes",
        slug: "herbs-tisanes",
        description: "Pure Himalayan herbs, hand-harvested wellness leaves, and traditional caffeine-free infusions.",
        displayOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        name: "Wild Forest Honey",
        slug: "honey",
        description: "Raw, unpasteurized, mono-floral and multi-flora wild honeys collected by indigenous tribes.",
        displayOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        name: "Heirloom Grains & Millets",
        slug: "grains-millets",
        description: "Nutritious traditional millets, unpolished indigenous rices, and stone-ground ancient grains.",
        displayOrder: 3,
      },
    }),
    prisma.category.create({
      data: {
        name: "Heritage Spices & Seasonings",
        slug: "spices",
        description: "High-curcumin Lakadong turmeric, Malabar black pepper, Kashmiri Mongra saffron, and wild rock salts.",
        displayOrder: 4,
      },
    }),
    prisma.category.create({
      data: {
        name: "Cold-Pressed Oils & Ghee",
        slug: "oils-ghee",
        description: "Traditional wood-pressed (Kachi Ghani) mustard, sesame, and A2 Desi cow bilona ghee.",
        displayOrder: 5,
      },
    }),
  ]);

  // 4. Seed Heritage Producers (Vendors)
  console.log("4. Creating Heritage Producers...");
  const producer1 = await prisma.vendor.create({
    data: {
      businessName: "Kashmir Saffron & Heritage Artisans",
      businessType: BusinessType.COOPERATIVE,
      producerType: ProducerType.COOPERATIVE,
      businessDescription: "4th-generation saffron growers from Pampore valley preserving traditional purple crocus harvesting techniques.",
      contactPerson: "Ghulam Hassan",
      email: "ghulam@kashmirsaffron.test",
      phone: "+91 9906693633",
      status: "APPROVED",
      isActive: true,
      village: "Pampore",
      district: "Pulwama",
      region: "Kashmir Valley",
      addressStreet: "Main Market, Saffron Colony",
      addressCity: "Pampore",
      addressState: "Jammu and Kashmir",
      addressPostalCode: "192121",
      addressCountry: "India",
      yearsInOperation: 48,
      generationCount: 4,
      traditionalExpertise: ["Hand-Stigma Plucking", "Sun-Shade Curing", "Soil Micro-Nutrient Management"],
      processingMethods: ["Artisanal Plucking", "Clay-Room Drying"],
      certifications: ["GI Tag Certified (Kashmir Saffron)", "FSSAI", "NPOP"],
      certificationsVerified: true,
      producerStory: {
        headline: "Guardians of the World's Most Prized Crimson Threads",
        body: "For four generations, our family cooperative has tended the fertile alluvial plateaus of Pampore. Each crocus flower blooms for merely two weeks in late autumn and must be harvested by hand before sunrise to preserve delicate volatile oils.",
        journey: [
          "1978: Cooperative founded with 12 farming families",
          "2014: Shifted entirely to natural regenerative composts",
          "2020: Awarded geographical indication (GI) certification",
        ],
      },
      shopSettings: {
        shopSlug: "kashmir-saffron-heritage",
        isPublished: true,
        banner: "https://images.unsplash.com/photo-1601056639638-c53c004a7138",
        bio: "Authentic Grade-1 Mongra saffron straight from Pampore's growers.",
      },
      metrics: {
        averageRating: 4.9,
        totalSales: 342,
        totalReviews: 86,
      },
    },
  });

  const producer2 = await prisma.vendor.create({
    data: {
      businessName: "Pahadi Amrut Forest Collective",
      businessType: BusinessType.ARTISAN,
      producerType: ProducerType.ARTISAN,
      businessDescription: "Women-led forest collective from Uttarakhand foraging wild herbs, rhododendron, and high-altitude stinging nettle.",
      contactPerson: "Kamla Devi",
      email: "kamla@pahadiamrut.test",
      phone: "+91 9412000000",
      status: "APPROVED",
      isActive: true,
      village: "Mana",
      district: "Chamoli",
      region: "Garhwal Himalayas",
      addressStreet: "Near Badrinath Route",
      addressCity: "Chamoli",
      addressState: "Uttarakhand",
      addressPostalCode: "246422",
      addressCountry: "India",
      yearsInOperation: 16,
      generationCount: 2,
      traditionalExpertise: ["Wild Forest Foraging", "Stone De-stoning", "Shade-Leaf Drying"],
      processingMethods: ["Wild Hand-Gathering", "Natural Himalayan Air-Drying"],
      certifications: ["Fair Wild Practices", "FSSAI", "PGS-India Green"],
      certificationsVerified: true,
      producerStory: {
        headline: "Pure High-Altitude Botanicals Harvested in Harmony with Nature",
        body: "Operating at 9,000 feet above sea level, our collective brings together 60 Pahadi women artisans. We never harvest more than one-third of any wild plant, ensuring sacred Himalayan meadows regenerate naturally year after year.",
        journey: [
          "2008: Formed to support local women's seasonal livelihoods",
          "2016: Built our solar drying micro-facility",
          "2024: Expanded to 8 surrounding mountain hamlets",
        ],
      },
      shopSettings: {
        shopSlug: "pahadi-amrut",
        isPublished: true,
        banner: "https://images.unsplash.com/photo-1544816155-12df9643f363",
        bio: "Hand-foraged Himalayan tisanes, nettle leaves, and mountain flora.",
      },
      metrics: {
        averageRating: 4.8,
        totalSales: 512,
        totalReviews: 124,
      },
    },
  });

  // 5. Seed Heritage Products
  console.log("5. Creating Heritage Products...");
  const product1 = await prisma.product.create({
    data: {
      name: "Pure Kashmiri Mongra Saffron (Grade 1)",
      slug: "pure-kashmiri-mongra-saffron-grade-1",
      eyebrow: "Pampore GI-Certified",
      description: "Whole deep-crimson stigmas harvested before dawn from the legendary karewas of Pampore. Unbroken, intensely fragrant, and naturally dried with zero additives.",
      shortDescription: "GI-tagged Grade 1 Kashmiri Mongra saffron with exceptionally high safranal and crocin content.",
      price: 680,
      compareAtPrice: 750,
      currency: "INR",
      sku: "FSO-SAF-001",
      stockQuantity: 120,
      hsn: "09102010",
      category: "Heritage Spices & Seasonings",
      categoryId: categories[3].id,
      packSize: "1g",
      image: "https://images.unsplash.com/photo-1601056639638-c53c004a7138",
      images: [
        "https://images.unsplash.com/photo-1601056639638-c53c004a7138",
        "https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0",
      ],
      originVillage: "Pampore",
      originDistrict: "Pulwama",
      originState: "Jammu and Kashmir",
      originRegion: "Kashmir Valley",
      originStory: "Grown in high-altitude lacustrine deposits (karewas) receiving snow-melt moisture and temperate sun.",
      harvestSeason: "Autumn (Late October - Early November)",
      harvestDate: "2025 Kharif Harvest",
      processingMethod: "Hand-Plucked & Shade-Cured in ventilated wooden trays",
      traditionalPreparation: "Steep 3-4 strands in 2 tbsp warm milk or water for 20 minutes before culinary use.",
      servingSuggestions: "Traditional saffron biryani, Kashmiri Kehwa, festive kheer, and Ayurvedic warm golden milk.",
      culinaryUses: ["Kehwa", "Biryani", "Kheer", "Halwa", "Infusions"],
      storageInstructions: "Store in airtight glass away from direct light and heat. Never refrigerate.",
      certifications: ["GI Tag Certified", "FSSAI Grade A"],
      vendorId: producer1.id,
      isVendorProduct: true,
      vendorStatus: "approved",
      isPublic: true,
      rating: 4.9,
      numReviews: 42,
      faqs: [
        {
          question: "How can I test the authenticity of this saffron?",
          answer: "Pure Mongra strands slowly release golden-yellow pigment into warm water over 15 minutes, remaining red themselves. Synthetic saffron turns red immediately and disintegrates.",
        },
      ],
      nutrition: [
        { label: "Crocin (Color Intensity)", value: "> 220" },
        { label: "Safranal (Aroma)", value: "> 35" },
        { label: "Picrocrocin (Bitter Flavor)", value: "> 70" },
      ],
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: "Wild Himalayan Stinging Nettle Tisane",
      slug: "wild-himalayan-stinging-nettle-tisane",
      eyebrow: "Wild Forest Foraged",
      description: "Sun-dried wild stinging nettle (Bichhu Buti) leaves hand-gathered above 8,500 feet in Chamoli, Uttarakhand. Earthy, grassy, and naturally mineral-rich.",
      shortDescription: "Iron-rich, caffeine-free wild nettle tisane hand-harvested by Pahadi women.",
      price: 340,
      compareAtPrice: 390,
      currency: "INR",
      sku: "FSO-NET-002",
      stockQuantity: 200,
      hsn: "12119029",
      category: "Herbs & Tisanes",
      categoryId: categories[0].id,
      packSize: "75g",
      image: "https://images.unsplash.com/photo-1544816155-12df9643f363",
      images: [
        "https://images.unsplash.com/photo-1544816155-12df9643f363",
      ],
      originVillage: "Mana",
      originDistrict: "Chamoli",
      originState: "Uttarakhand",
      originRegion: "Garhwal Himalayas",
      originStory: "Wild plants flourishing naturally near glacier-fed streams without artificial fertilizers or pesticides.",
      harvestSeason: "Spring & Monsoon",
      harvestDate: "Monsoon 2025",
      processingMethod: "Gentle solar de-moisturizing and hand-crushed whole leaf sorting",
      traditionalPreparation: "Steep 1 tsp in boiling water for 5-7 minutes. Strain and enjoy warm with mountain honey.",
      servingSuggestions: "Daily morning detox beverage or evening relaxing infusion.",
      culinaryUses: ["Hot Tisane", "Iced Herbal Tea", "Herbal Broth Base"],
      storageInstructions: "Store in a cool, dry cupboard in an airtight tin.",
      certifications: ["Fair Wild", "FSSAI"],
      vendorId: producer2.id,
      isVendorProduct: true,
      vendorStatus: "approved",
      isPublic: true,
      rating: 4.8,
      numReviews: 28,
      faqs: [
        {
          question: "Does the dried nettle sting when brewed?",
          answer: "No, drying and thermal processing completely denature the formic acid needles that cause the fresh sting.",
        },
      ],
      nutrition: [
        { label: "Iron", value: "High / Natural" },
        { label: "Magnesium", value: "Rich" },
        { label: "Caffeine", value: "0mg (Naturally Free)" },
      ],
    },
  });

  // 6. Seed FSO Editorial Articles ("Kitchen Wisdom")
  console.log("6. Creating Editorial Articles...");
  const article1 = await prisma.article.create({
    data: {
      title: "The Alchemy of Saffron: Understanding Pure Mongra from Pampore",
      slug: "alchemy-of-saffron-pampore-guide",
      excerpt: "Why true Kashmiri saffron commands respect across world cuisines, and how four generations of growers preserve its sacred aroma.",
      content: "<p>In the high alluvial tablelands of Pampore, autumn brings a transformative purple haze across the earth. Known locally as the <em>Kong Posh</em>, the lilac flowers of Crocus sativus emerge for only a few fleeting weeks...</p><h3>How to Identify Genuine Grade 1 Saffron</h3><p>Genuine saffron never stains water red immediately. When dropped into lukewarm liquid, pure strands slowly unfurl a luminous golden yellow halo over twenty minutes.</p>",
      image: "https://images.unsplash.com/photo-1601056639638-c53c004a7138",
      category: "Ingredient Spotlight",
      authorName: "Heritage Culinary Editor",
      authorBio: "Documenting indigenous food systems and artisanal kitchen traditions across Bharat.",
      readTime: 6,
      published: true,
      publishedAt: new Date(),
      tags: ["Saffron", "Kashmir", "Spices", "Kitchen Wisdom"],
      createdById: editorUser.id,
    },
  });

  // Link Article to Product & Producer
  await prisma.articleProduct.create({
    data: {
      articleId: article1.id,
      productId: product1.id,
    },
  });

  await prisma.articleProducer.create({
    data: {
      articleId: article1.id,
      vendorId: producer1.id,
    },
  });

  // 7. Seed Heritage Recipes
  console.log("7. Creating Heritage Recipes...");
  const recipe1 = await prisma.recipe.create({
    data: {
      title: "Traditional Kashmiri Zafrani Kehwa",
      slug: "traditional-kashmiri-zafrani-kehwa",
      story: "The quintessential celebratory infusion of the Kashmir Valley, brewed in a copper samovar with crushed almonds, whole green cardamom, cinnamon, and genuine Mongra saffron.",
      excerpt: "Fragrant, golden tea infused with whole spices and topped with slivered almonds.",
      region: "North India",
      cuisine: "Kashmiri",
      difficulty: RecipeDifficulty.EASY,
      prepTime: 5,
      cookTime: 10,
      totalTime: 15,
      servings: 4,
      image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3",
      ingredients: [
        { name: "Water", quantity: "4 cups", note: "pure spring water preferred" },
        { name: "Kashmiri Mongra Saffron", quantity: "8-10 strands", note: "gently crushed" },
        { name: "Green Cardamom", quantity: "4 pods", note: "lightly bruised" },
        { name: "Cinnamon Stick", quantity: "1 inch piece" },
        { name: "Green Tea Leaves", quantity: "1 tsp", note: "mild Kashmiri variety" },
        { name: "Blanched Almonds", quantity: "2 tbsp", note: "finely slivered" },
        { name: "Wild Forest Honey or Rock Sugar", quantity: "to taste" },
      ],
      steps: [
        {
          stepNumber: 1,
          instruction: "In a saucepan, bring 4 cups of water to a rolling boil with crushed cardamom pods and cinnamon stick.",
        },
        {
          stepNumber: 2,
          instruction: "Add 8-10 strands of Kashmiri saffron and simmer on low heat for 5 minutes until liquid turns fragrant golden amber.",
        },
        {
          stepNumber: 3,
          instruction: "Remove from heat, add green tea leaves, cover with lid, and steep for 2 minutes. Do not over-boil tea leaves.",
        },
        {
          stepNumber: 4,
          instruction: "Place slivered almonds in ceramic cups, strain the hot Kehwa over them, and sweeten with wild honey.",
        },
      ],
      tips: [
        "Crush the saffron strands between your thumb and fingertips right over the pot to release maximum volatile safranal.",
      ],
      tags: ["Kehwa", "Beverages", "Winter Warmers", "Kashmir", "Saffron"],
      published: true,
      publishedAt: new Date(),
      createdById: editorUser.id,
    },
  });

  await prisma.recipeProduct.create({
    data: {
      recipeId: recipe1.id,
      productId: product1.id,
    },
  });

  // 8. Seed Heritage Ingredients
  console.log("8. Creating Heritage Ingredients Knowledge Base...");
  await prisma.ingredient.create({
    data: {
      name: "Kashmiri Mongra Saffron",
      slug: "kashmiri-mongra-saffron",
      hindiName: "केसर (Kesar)",
      regionalNames: [
        { language: "Kashmiri", name: "Kong" },
        { language: "Sanskrit", name: "Kumkuma" },
      ],
      botanicalName: "Crocus sativus",
      descriptor: "World's most revered crimson stigmas, celebrated for exceptional crocin concentration and deep floral aroma.",
      image: "https://images.unsplash.com/photo-1601056639638-c53c004a7138",
      origin: "Pampore plateau, Jammu & Kashmir",
      history: "Documented in Sanskrit medical treatises dating back over 2,500 years as both a culinary royal seasoning and rasayana tonic.",
      regionalImportance: "Sacred centerpiece of the traditional Kashmiri Wazwan multi-course feast and wedding rituals.",
      culinaryUses: ["Festive Biryani", "Kehwa Infusions", "Ayurvedic Golden Milk", "Traditional Mithai"],
      storage: "Keep in airtight opaque amber glass. Never refrigerate or freeze.",
      tags: ["Spices", "Ayurvedic", "GI Tag", "Heritage"],
      published: true,
      createdById: editorUser.id,
    },
  });

  // 9. Seed Curated Collections
  console.log("9. Creating Curated Collections...");
  const collection1 = await prisma.collection.create({
    data: {
      title: "Himalayan Morning Rituals Box",
      slug: "himalayan-morning-rituals-box",
      subtitle: "Ancient mountain botanicals and golden saffron for mindful mornings",
      story: "A curation of pure high-altitude botanicals harvested by mountain communities across the northern ranges.",
      category: "Gift Box",
      image: "https://images.unsplash.com/photo-1544816155-12df9643f363",
      isPublished: true,
      publishedAt: new Date(),
      displayOrder: 1,
      createdById: editorUser.id,
    },
  });

  await prisma.collectionProduct.create({
    data: {
      collectionId: collection1.id,
      productId: product1.id,
      displayOrder: 1,
    },
  });

  await prisma.collectionProduct.create({
    data: {
      collectionId: collection1.id,
      productId: product2.id,
      displayOrder: 2,
    },
  });

  // 10. Seed CMS Banners
  console.log("10. Creating CMS Banners...");
  await prisma.banner.create({
    data: {
      title: "Good Food Begins at the Source",
      subtitle: "Connect directly with authentic Indian food artisans, tribal foragers, and heritage farmers.",
      image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854",
      ctaText: "Explore Producers",
      ctaHref: "/producers",
      position: "home_hero",
      isActive: true,
      displayOrder: 1,
      createdById: adminUser.id,
    },
  });

  console.log("\n✅ FSO Neon PostgreSQL Database Seeding Complete!");
  console.log("──────────────────────────────────────────────────");
  console.log("Admin account:    admin@fso.in / FSO_Admin_2026!");
  console.log("Editor account:   editor@fso.in / FSO_Editor_2026!");
  console.log("Customer account: demo_customer@fso.in / Customer_2026!");
  console.log("Producers:        2 approved heritage producer collectives");
  console.log("Products:         2 heritage products with complete provenance");
  console.log("Content:          Editorial articles, recipes, ingredients, & collections");
  console.log("──────────────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
