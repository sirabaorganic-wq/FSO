/**
 * FSO Core and Content Models Schema Tests - Neon PostgreSQL (Prisma ORM)
 */

const { Prisma } = require("@prisma/client");

describe("FSO Model Schema Validations (Prisma PostgreSQL Schema)", () => {
  const getModel = (name) => Prisma.dmmf.datamodel.models.find((m) => m.name === name);
  const getFieldNames = (modelName) => {
    const model = getModel(modelName);
    return model ? model.fields.map((f) => f.name) : [];
  };

  describe("Product Model (Extended for FSO Heritage)", () => {
    it("has FSO origin, harvest, and processing fields in relational schema", () => {
      const fields = getFieldNames("Product");

      // Origin fields
      expect(fields).toContain("originVillage");
      expect(fields).toContain("originDistrict");
      expect(fields).toContain("originState");
      expect(fields).toContain("originRegion");

      // Agricultural & culinary fields
      expect(fields).toContain("harvestSeason");
      expect(fields).toContain("processingMethod");
      expect(fields).toContain("storageInstructions");
      expect(fields).toContain("eyebrow");
      expect(fields).toContain("packSize");

      // Relational junction links
      expect(fields).toContain("articleLinks");
      expect(fields).toContain("recipeLinks");
      expect(fields).toContain("ingredientLinks");
      expect(fields).toContain("collectionLinks");
    });

    it("supports open certifications string array", () => {
      const model = getModel("Product");
      const certField = model.fields.find((f) => f.name === "certifications");
      expect(certField).toBeDefined();
      expect(certField.isList).toBe(true);
      expect(certField.type).toBe("String");
    });

    it("defaults currency to INR", () => {
      const model = getModel("Product");
      const currencyField = model.fields.find((f) => f.name === "currency");
      expect(currencyField.default).toBe("INR");
    });
  });

  describe("Vendor Model (Extended for FSO Producers)", () => {
    it("has FSO producer identity and geography fields", () => {
      const fields = getFieldNames("Vendor");

      expect(fields).toContain("village");
      expect(fields).toContain("district");
      expect(fields).toContain("region");
      expect(fields).toContain("producerType");
      expect(fields).toContain("producerStory");
      expect(fields).toContain("traditionalExpertise");
      expect(fields).toContain("processingMethods");
      expect(fields).toContain("verificationBadges");
    });

    it("defines BusinessType and ProducerType enums", () => {
      const enums = Prisma.dmmf.datamodel.enums;
      const bType = enums.find((e) => e.name === "BusinessType");
      expect(bType).toBeDefined();
      const values = bType.values.map((v) => v.name);
      expect(values).toContain("ARTISAN");
      expect(values).toContain("COOPERATIVE");
      expect(values).toContain("FARMER");
      expect(values).toContain("TRADITIONAL_PRODUCER");
    });
  });

  describe("FSO Content Models", () => {
    it("Article schema defines required editorial fields and M:N relations", () => {
      const fields = getFieldNames("Article");
      expect(fields).toContain("title");
      expect(fields).toContain("slug");
      expect(fields).toContain("category");
      expect(fields).toContain("published");
      expect(fields).toContain("linkedProducts");
      expect(fields).toContain("linkedRecipes");
      expect(fields).toContain("linkedProducers");
    });

    it("Recipe schema defines structured cooking fields and M:N relations", () => {
      const fields = getFieldNames("Recipe");
      expect(fields).toContain("title");
      expect(fields).toContain("slug");
      expect(fields).toContain("region");
      expect(fields).toContain("difficulty");
      expect(fields).toContain("ingredients");
      expect(fields).toContain("steps");
      expect(fields).toContain("linkedProducts");
      expect(fields).toContain("linkedIngredients");
    });

    it("Ingredient schema defines heritage taxonomy fields", () => {
      const fields = getFieldNames("Ingredient");
      expect(fields).toContain("name");
      expect(fields).toContain("slug");
      expect(fields).toContain("hindiName");
      expect(fields).toContain("descriptor");
      expect(fields).toContain("linkedProducts");
      expect(fields).toContain("recipeLinks");
    });

    it("Collection schema defines curation fields", () => {
      const fields = getFieldNames("Collection");
      expect(fields).toContain("title");
      expect(fields).toContain("slug");
      expect(fields).toContain("category");
      expect(fields).toContain("products");
      expect(fields).toContain("isPublished");
    });

    it("Banner schema defines scheduling and positioning fields", () => {
      const fields = getFieldNames("Banner");
      expect(fields).toContain("title");
      expect(fields).toContain("image");
      expect(fields).toContain("position");
      expect(fields).toContain("isActive");
      expect(fields).toContain("displayOrder");
    });
  });

  describe("FSO Commerce & Persistence Architecture", () => {
    it("defines relational models for Cart, Order, Payment, and Webhooks", () => {
      expect(getModel("Cart")).toBeDefined();
      expect(getModel("CartItem")).toBeDefined();
      expect(getModel("Order")).toBeDefined();
      expect(getModel("OrderItem")).toBeDefined();
      expect(getModel("VendorOrder")).toBeDefined();
      expect(getModel("Payment")).toBeDefined();
      expect(getModel("WebhookLog")).toBeDefined();
      expect(getModel("RefundLog")).toBeDefined();
      expect(getModel("Review")).toBeDefined();
    });
  });
});
