// Quick isolated test of the validation logic extracted from vendorRoutes.js
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const FSSAI_REGEX = /^\d{14}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const POSTAL_REGEX = /^\d{6}$/;
const ACCT_REGEX = /^\d{9,18}$/;

let passed = 0;
let failed = 0;

function assert(label, condition) {
    if (condition) {
        console.log("  PASS  " + label);
        passed++;
    } else {
        console.error("  FAIL  " + label);
        failed++;
    }
}

console.log("\n=== PAN Validation ===");
assert("Valid PAN: ABCDE1234F", PAN_REGEX.test("ABCDE1234F"));
assert("Valid PAN: AABCD1234A", PAN_REGEX.test("AABCD1234A"));
assert("Reject short PAN: ABCDE123", !PAN_REGEX.test("ABCDE123"));
assert("Reject lowercase: abcde1234f", !PAN_REGEX.test("abcde1234f"));
assert("Reject extra chars: ABCDE1234FF", !PAN_REGEX.test("ABCDE1234FF"));

console.log("\n=== GST Validation ===");
assert("Valid GST: 22AAAAA0000A1Z5", GST_REGEX.test("22AAAAA0000A1Z5"));
assert("Valid GST: 07AABCU9603R1ZP", GST_REGEX.test("07AABCU9603R1ZP"));
assert("Reject short: 12345", !GST_REGEX.test("12345"));
assert("Reject missing Z: 22AAAAA0000A1X5", !GST_REGEX.test("22AAAAA0000A1X5"));

console.log("\n=== FSSAI Validation ===");
assert("Valid FSSAI (14 digits): 12345678901234", FSSAI_REGEX.test("12345678901234"));
assert("Reject 13 digits: 1234567890123", !FSSAI_REGEX.test("1234567890123"));
assert("Reject 15 digits: 123456789012345", !FSSAI_REGEX.test("123456789012345"));
assert("Reject alphanumeric: 1234567890123A", !FSSAI_REGEX.test("1234567890123A"));

console.log("\n=== IFSC Validation ===");
assert("Valid IFSC: HDFC0001234", IFSC_REGEX.test("HDFC0001234"));
assert("Valid IFSC: SBIN0125620", IFSC_REGEX.test("SBIN0125620"));
assert("Reject: HDFC001", !IFSC_REGEX.test("HDFC001"));
assert("Reject no zero: HDFC1001234", !IFSC_REGEX.test("HDFC1001234"));
assert("Reject lowercase: hdfc0001234", !IFSC_REGEX.test("hdfc0001234"));

console.log("\n=== Phone Validation ===");
assert("Valid phone: 9876543210", PHONE_REGEX.test("9876543210"));
assert("Valid phone: 6000000000", PHONE_REGEX.test("6000000000"));
assert("Reject starts with 5: 5987654321", !PHONE_REGEX.test("5987654321"));
assert("Reject 9 digits: 987654321", !PHONE_REGEX.test("987654321"));

console.log("\n=== Postal Code Validation ===");
assert("Valid postal: 110001", POSTAL_REGEX.test("110001"));
assert("Reject 5 digits: 11000", !POSTAL_REGEX.test("11000"));
assert("Reject alpha: 110A01", !POSTAL_REGEX.test("110A01"));

console.log("\n=== Bank Account Number Validation ===");
assert("Valid 9-digit: 123456789", ACCT_REGEX.test("123456789"));
assert("Valid 18-digit: 123456789012345678", ACCT_REGEX.test("123456789012345678"));
assert("Reject 8-digit: 12345678", !ACCT_REGEX.test("12345678"));
assert("Reject 19-digit: 1234567890123456789", !ACCT_REGEX.test("1234567890123456789"));
assert("Reject alpha: 12345678A", !ACCT_REGEX.test("12345678A"));

console.log("\n==============================");
console.log("Results: " + passed + " passed, " + failed + " failed");
if (failed > 0) process.exit(1);
