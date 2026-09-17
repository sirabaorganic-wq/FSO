# Invoice System - Updated with Style 4 Design

## ✅ What's Been Updated

### 1. Invoice Design
- **Style**: Modern gradient design (Style 4) - card-based layout with vibrant colors
- **Logo**: Siraba Organic logo integrated in the header (70x70px)
- **Colors**: 
  - Primary Green: `#1a4d2e` (dark green)
  - Accent Green: `#7cb342` (lime green)
  - Gradients for modern look
- **Layout**: Optimized to fit perfectly on one A4 page

### 2. Features
✅ Company logo displayed prominently  
✅ Clean card-based information layout  
✅ Professional gradient accents  
✅ Compact design - fits on 1 page  
✅ Print-ready PDF format  
✅ Embedded logo (base64) - no external files needed

## 📄 Invoice Sections

1. **Header**
   - Logo + Company name
   - Company contact info
   - Invoice number (large, right-aligned)

2. **Detail Cards** (3 columns)
   - Bill To (customer info)
   - Invoice Date & Order ID
   - Order Status badge

3. **Items Table**
   - Product name & description
   - Quantity, unit price, amount
   - Professional styling with green header

4. **Totals Box**
   - Subtotal, Tax, Shipping
   - Grand Total (highlighted with gradient)

5. **Footer**
   - Thank you message
   - Authorized signatory line

## 🚀 How to Use

### Backend is Ready ✅
The invoice system is already integrated:
- Route: `/api/invoices/:orderId/download`
- Route: `/api/invoices/:orderId/preview`

### Add Download Button to Frontend

**In Account.jsx (Orders Section):**

```javascript
import { downloadInvoice } from '../utils/invoiceUtils';
import { Download } from 'lucide-react';

// Inside your orders map:
<button 
    onClick={() => downloadInvoice(order._id)}
    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-accent transition-colors"
>
    <Download size={16} />
    Download Invoice
</button>
```

**In OrderSuccess.jsx:**

```javascript
import { downloadInvoice } from '../utils/invoiceUtils';

<button 
    onClick={() => downloadInvoice(orderId)}
    className="btn-primary"
>
    Download Invoice PDF
</button>
```

## 📱 Test the Invoice

### Option 1: Preview in Browser
```javascript
// Visit in browser (replace ORDER_ID with actual order ID):
http://localhost:5000/api/invoices/ORDER_ID/preview

// Must be logged in (token in localStorage)
```

### Option 2: Download PDF
```javascript
import { downloadInvoice } from '../utils/invoiceUtils';

// Call from any component:
await downloadInvoice('your-order-id-here');

// File will download as: Invoice-XXXXXXXX.pdf
```

## 🎨 Invoice Customization

To modify the invoice design, edit:
```
backend/templates/invoices/invoice-template.html
```

### Common Customizations:

**Change Colors:**
```css
/* In the <style> section */
background: linear-gradient(90deg, #1a4d2e 0%, #YOUR_COLOR 100%);
color: #YOUR_COLOR;
```

**Modify Logo Size:**
```css
.logo {
    width: 80px;  /* Change from 70px */
    height: 80px;
}
```

**Adjust Page Margins:**
```css
@page {
    margin: 15mm; /* Change as needed */
}
```

## 📋 File Structure

```
backend/
├── routes/
│   └── invoiceRoutes.js          # Invoice API routes
├── templates/
│   └── invoices/
│       ├── invoice-template.html  # Main template (Style 4)
│       ├── logo.png              # Siraba logo
│       └── README.md             # This file
└── server.js                     # Routes registered

frontend/
└── src/
    └── utils/
        └── invoiceUtils.js       # Download/Preview functions
```

## 🔒 Security
- ✅ JWT authentication required
- ✅ Users can only access their own invoices
- ✅ Admins can access all invoices
- ✅ Logo embedded as base64 (no file path exposure)

## 📐 Technical Details

- **Page Format**: A4 (210mm × 297mm)
- **Margins**: 15mm all sides
- **Font Sizes**: 10-28px (optimized for readability)
- **Logo Format**: PNG, embedded as base64
- **PDF Engine**: Puppeteer (Chromium)
- **Template Engine**: Handlebars

## 🎯 Invoice Data Flow

1. User clicks "Download Invoice"
2. Frontend calls `downloadInvoice(orderId)`
3. Backend fetches order from database
4. Template populated with order data
5. Logo converted to base64
6. HTML rendered by Puppeteer
7. PDF generated and downloaded

---

**Invoice Number Format**: `#` + Last 8 characters of Order ID (uppercase)  
**Filename Format**: `Invoice-XXXXXXXX.pdf`

Everything is ready to use! 🎉
