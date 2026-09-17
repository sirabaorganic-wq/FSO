# Quick GST Setup

## Set Vendor GSTIN (Choose One Method)

### Method 1: Run Setup Script (Recommended)
```bash
cd backend
node scripts/setup-gst.js
```

Then update the GSTIN with actual Siraba Organic GSTIN via admin panel.

### Method 2: Direct Database Update
```javascript
// MongoDB Shell or Compass
use your_database_name

db.gstsettings.updateOne(
  {},
  {
    $set: {
      gst_enabled: true,
      default_gst_percentage: 18,
      admin_gst_number: "01XXXXX1234Y1Z5" // Replace with actual GSTIN
    }
  },
  { upsert: true }
)
```

### Method 3: Via API (if admin endpoints exist)
```bash
curl -X PUT http://localhost:5000/api/admin/gst-settings \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "gst_enabled": true,
    "default_gst_percentage": 18,
    "admin_gst_number": "01XXXXX1234Y1Z5"
  }'
```

## Verify Setup

```bash
# Check orders are saving GST data
cd backend
node check_orders_gst.js
```

Or manually check an order in database:
```javascript
db.orders.findOne({}, { gstClaimed: 1, buyerGstNumber: 1, sellerGstNumber: 1 })
```

Should return:
```javascript
{
  gstClaimed: true/false,
  buyerGstNumber: "29XXXXX..." or null,
  sellerGstNumber: "01XXXXX..." // Should always be present
}
```

## Test Invoice Generation

1. Create test order without GST claim
2. Create test order with GST claim (use test GSTIN: 29ABCDE1234F1Z5)
3. Download both invoices
4. Verify vendor GSTIN appears on both
5. Verify buyer GSTIN appears only on claimed invoice

## Important Notes

- ⚠️ **Vendor GSTIN is MANDATORY** for Indian invoices when registered under GST
- ⚠️ If no vendor GSTIN is set, invoices will show "Tax (Included)" instead
- ✅ The system now defaults to showing GST details when vendor GSTIN exists
- ✅ Price remains same whether GST is claimed or not (this is correct!)

## Get Siraba Organic GSTIN

Ask the business owner for the official GSTIN from:
- GST Registration Certificate
- GST Portal login
- Previous tax invoices
- CA/Accountant

Kashmir (Union Territory) GST State Code: **01**

Format example for Kashmir: `01ABCDE1234F1Z5`
