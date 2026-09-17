// Constants for Siraba Organic Vendor Onboarding System

const ACTIVE_ONBOARDING_DOCUMENT_TYPES = [
  "business_legal_identity",
  "fssai_license",
  "gst_certificate",
  "npop_certificate",
  "usda_organic_certificate",
  "other_organic_certificate",
  "organic_certificate",
  "product_specification",
  "product_label_packaging",
  "representative_product_image",
  "laboratory_report_coa",
];

const ONBOARDING_DOCUMENT_REQUIREMENTS = {
  business_legal_identity: { required: true, label: "Business / Legal Identity Document" },
  fssai_license: { required: true, label: "FSSAI Licence / Registration" },
  gst_certificate: { required: false, conditional: true, label: "GST Certificate" }, // Required if gstApplicable === 'yes'
  npop_certificate: { required: true, label: "NPOP / India Organic Certificate" },
  usda_organic_certificate: { required: true, label: "USDA Organic Certificate" },
  other_organic_certificate: { required: false, label: "Other Organic Certificate" },
  organic_certificate: { required: false, label: "Organic Certificate" },
  product_specification: { required: false, label: "Product Specification / Ingredients" },
  product_label_packaging: { required: true, label: "Product Label / Packaging" },
  representative_product_image: { required: true, label: "Representative Product Image" },
  laboratory_report_coa: { required: false, label: "Accredited Laboratory Report / CoA" },
};

const CERTIFICATION_ROUTES = [
  { key: "npop", label: "NPOP / India Organic", standardName: "NPOP" },
  { key: "pgs", label: "PGS-India, where applicable", standardName: "PGS-India" },
  { key: "usda", label: "USDA Organic", standardName: "USDA Organic" },
  { key: "eu", label: "EU Organic", standardName: "EU Organic" },
  { key: "other", label: "Other recognized certification", standardName: "Other" },
];

const LEGACY_DOCUMENT_TYPES = [
  "business_license",
  "pan_card",
  "npop_certificate",
  "product_scope_certificate",
  "usda_organic_certificate",
  "eu_organic_certificate",
  "jas_organic_certificate",
  "india_organic_certificate",
  "fair_trade_certificate",
  "rainforest_alliance_certificate",
  "other_international_organic",
  "product_list",
  "product_labels",
  "packaging_information",
  "batch_identification",
  "product_images",
  "certificate_of_analysis",
  "product_specification_sheets",
  "shelf_life_documentation",
  "ingredient_declaration",
  "nabl_certificate",
  "pesticide_residue_report",
  "heavy_metal_report",
  "microbiological_report",
  "product_quality_report",
  "farm_to_fork_records",
  "source_farm_documentation",
  "procurement_records",
  "supply_chain_documentation",
  "batch_traceability_system",
  "organic_compliance_records",
  "food_grade_packaging",
  "fssai_compliant_labeling",
  "certification_claims_display",
  "batch_number_documentation",
  "manufacturing_details",
  "best_before_expiry",
];

module.exports = {
  ACTIVE_ONBOARDING_DOCUMENT_TYPES,
  ONBOARDING_DOCUMENT_REQUIREMENTS,
  CERTIFICATION_ROUTES,
  LEGACY_DOCUMENT_TYPES,
};
