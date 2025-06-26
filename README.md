# Partner Payment Integration Sample

This sample project demonstrates how **Partner** can integrate with **Goodpass Payment APIs** to process payments using both direct (Stripe.js) and hosted (Stripe Checkout) flows. The integration uses **real Goodpass APIs** in test mode with Stripe test cards.

## 🔥 Real API Integration

This sample connects to the **actual Goodpass Partner API** at `https://partner-api.goodpass.club/v1` using your UAT API key. All payment processing goes through the real Stripe test environment.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Server runs on http://localhost:5010
```

### 🎯 Frontend Demo

Open the comprehensive frontend demo in your browser:

```
http://localhost:5010/index.html
```

## 🏗️ Architecture Implementation

### **Direct Payment Flow (Stripe.js)**

```
Partner Frontend → Stripe.js → Create PaymentMethod → Direct Payment API → Goodpass API → 3D Secure (if needed)
```

### **Hosted Payment Flow (Stripe Checkout)**

```
Partner Frontend → Create Session API → Stripe Checkout → Customer Payment → Automatic Completion → Status Check
```

## 📋 Order Creation Requirement

**Important**: The Goodpass API requires orders to be created in their system before payment processing. The typical workflow is:

1. **Create Order** (via Goodpass Order API)
2. **Initialize Payment** (this sample)
3. **Handle 3D Secure** (automatic via webhooks)
4. **Check Payment Status** (this sample)

For testing purposes, you'll need to create test orders through Goodpass Order creation API first

## 🔑 Authentication

The sample uses your UAT API key: `gp_wC67T...TNa4`

All API calls include the proper `Authorization: Bearer` header.

## 💳 Test Cards (Stripe Test Mode)

| Scenario      | Card Number           | PaymentMethod Token             | Description                         |
| ------------- | --------------------- | ------------------------------- | ----------------------------------- |
| **Success**   | `4242 4242 4242 4242` | `pm_card_visa`                  | Immediate success without 3D Secure |
| **3D Secure** | `4000 0027 6000 3184` | `pm_card_threeDSecure2Required` | Requires 3D Secure authentication   |
| **Decline**   | `4000 0000 0000 0002` | `pm_card_visa_chargeDeclined`   | Card declined by bank               |

Use any **future expiry date** and any **3-digit CVC**.

### Order Codes for Testing

You should create test orders through Goodpass Order creation API first

## 🔄 Payment Flows

### Direct Payment Flow (Stripe.js)

```
1. 💳 User enters card details (Stripe.js collects securely)
2. 🔄 Frontend creates PaymentMethod token
3. ⚡ API call to /payments/direct/process
4. 📊 Handle response:
   ├─ ✅ succeeded: Payment complete
   ├─ 🔐 requires_action: Redirect to 3D Secure
   └─ ❌ failed: Show error message
5. 🔍 Check status after 3D Secure return
```

### Direct Payment with 3D Secure

```
1. POST /api/v1/payments/direct/process
   ↓ (status: requires_action)
2. Redirect to 3D Secure URL
   ↓ (customer completes authentication)
3. Customer returns to returnUrl
   ↓ (payment completed automatically)
4. GET /api/v1/payments/direct/status/:paymentIntentId (verify)
```

### Hosted Payment Flow (Stripe Checkout)

```
1. 🛒 Frontend calls /payments/hosted/create-session
2. 🔗 Redirect user to Stripe Checkout URL
3. 💳 User completes payment on Stripe's page
4. ↩️ Stripe redirects back to success/cancel URL
5. ✅ Verify payment completion via session status
```

## 📡 API Endpoints

### Payment Configuration

- `GET /api/v1/payments/config` - Get Stripe publishable key for frontend integration

### Payment Processing

- `POST /api/v1/payments/direct/process` - Process direct payment with PaymentMethod token
- `GET /api/v1/payments/direct/status/:paymentIntentId` - Check direct payment status
- `POST /api/v1/payments/hosted/create-session` - Create Stripe Checkout session
- `GET /api/v1/payments/hosted/session/:sessionId` - Check hosted payment status
- `GET /api/v1/payments/history` - Payment history with filtering
- `GET /api/v1/payments/return` - 3DS return handler

### Demo & Testing

- `GET /api/v1/demo/scenarios` - Available test scenarios
- `POST /api/v1/demo/test-payment` - Run direct payment test scenarios
- `POST /api/v1/demo/check-payment-status` - Check payment status after processing
- `POST /api/v1/demo/test-hosted-payment` - Test hosted payment flow

## 🧪 Testing the Integration

### 1. View Demo Scenarios

```bash
curl http://localhost:5010/api/v1/demo/scenarios
```

### 2. Test Direct Payment Flow

```bash
# Test successful direct payment
curl -X POST http://localhost:5010/api/v1/demo/test-payment \
  -H "Content-Type: application/json" \
  -d '{"scenario": "success", "orderCode": "YOUR_ORDER_CODE"}'

# Test 3D Secure payment
curl -X POST http://localhost:5010/api/v1/demo/test-payment \
  -H "Content-Type: application/json" \
  -d '{"scenario": "threeDSecure", "orderCode": "YOUR_ORDER_CODE"}'

# Test declined payment
curl -X POST http://localhost:5010/api/v1/demo/test-payment \
  -H "Content-Type: application/json" \
  -d '{"scenario": "declined", "orderCode": "YOUR_ORDER_CODE"}'
```

### 3. Test Hosted Payment Flow

```bash
# Test hosted payment (Stripe Checkout)
curl -X POST http://localhost:5010/api/v1/demo/test-hosted-payment \
  -H "Content-Type: application/json" \
  -d '{"orderCode": "YOUR_ORDER_CODE"}'
```

### 4. Check Payment Status

```bash
# Check payment status after 3D Secure or processing
curl -X POST http://localhost:5010/api/v1/demo/check-payment-status \
  -H "Content-Type: application/json" \
  -d '{"paymentIntentId": "pi_1234567890"}'
```

## 🖥️ Frontend Integration Examples

### Direct Payment Integration

```javascript
// 1. Get Stripe publishable key from Goodpass API
const configResponse = await fetch('/api/v1/payments/config', {
  headers: {
    Authorization: 'Bearer YOUR_API_KEY',
  },
});
const config = await configResponse.json();

// 2. Initialize Stripe with dynamic key
const stripe = Stripe(config.publishableKey);

// 3. Create payment method with Stripe.js
const { paymentMethod } = await stripe.createPaymentMethod({
  type: 'card',
  card: cardElement,
});

// 4. Process direct payment
const response = await fetch('/api/v1/payments/direct/process', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    orderCode: 'YOUR_ORDER_CODE',
    paymentMethod: {
      type: 'card',
      token: paymentMethod.id,
      cardBrand: paymentMethod.card.brand,
      cardCountry: paymentMethod.card.country,
      last4: paymentMethod.card.last4,
    },
    returnUrl: window.location.origin + '/payment-return.html',
  }),
});
```

### Hosted Payment Integration

```javascript
// 1. Create checkout session
const sessionResponse = await fetch('/api/v1/payments/hosted/create-session', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    orderCode: 'YOUR_ORDER_CODE',
    successUrl: window.location.origin + '/payment-success.html',
    cancelUrl: window.location.origin + '/payment-cancel.html',
  }),
});

// 2. Redirect to Stripe Checkout
const session = await sessionResponse.json();
window.location.href = session.checkoutUrl;
```

## 📂 Demo File Structure

```
public/
├── index.html              # Main demo page
├── payment-success.html    # Hosted payment success page
├── payment-cancel.html     # Hosted payment cancel page
└── payment-return.html     # Direct payment 3DS return page
```

## 🌐 Demo Pages

| Page           | URL                     | Purpose                           |
| -------------- | ----------------------- | --------------------------------- |
| **Main Demo**  | `/index.html`           | Complete payment integration demo |
| **Success**    | `/payment-success.html` | Hosted payment success handler    |
| **Cancel**     | `/payment-cancel.html`  | Hosted payment cancel handler     |
| **3DS Return** | `/payment-return.html`  | Direct payment 3DS return handler |

## 📱 Demo Features

### 🎯 Direct Payments (Stripe.js Integration)

- **Real Stripe.js integration** with card element
- **3D Secure authentication** handling with automatic redirects
- **Payment status checking** with real-time updates
- **Test card support** with different scenarios (success, 3DS, decline)

### 🛒 Hosted Payments (Stripe Checkout)

- **Stripe Checkout session** creation and management
- **Redirect-based flow** to Stripe's secure payment pages
- **Session status verification** after payment completion
- **Success/cancel page handling**

### 📊 Additional Features

- **Payment history viewer** with real API data
- **Status checkers** for both payment types
- **Real-time error handling** and user feedback
- **Mobile-responsive design** with modern UI

## 🔒 Security Implementation & Benefits

### **Security Implementation:**

- ✅ PaymentMethod tokens used instead of raw card data (PCI compliant)
- ✅ Direct payments support custom UI with Stripe.js tokenization
- ✅ Hosted payments provide complete PCI compliance via Stripe Checkout
- ✅ Partner authentication via existing API key system
- ✅ Automatic 3D Secure handling for enhanced security

### **For Goodpass:**

- **No PCI Compliance Required** - Only handles tokenized data
- **Reduced Security Scope** - Stripe manages all sensitive data
- **Dynamic Key Management** - Keys provided only when appropriate
- **SAQ-A Eligible** - Simplest PCI assessment path

### **For PCI Compliant Partners:**

- **Full UI Control** - Custom payment experiences with Stripe.js
- **Tokenized Security** - Never send raw card data to Goodpass
- **Reduced PCI Scope** - Leverage Stripe's infrastructure
- **Enhanced UX** - Customers stay on partner site

### **For Non-PCI Partners:**

- **Zero Card Data Exposure** - Complete security through hosted checkout
- **Automatic Compliance** - Stripe handles all PCI requirements
- **Quick Integration** - Minimal development effort
- **Global Ready** - Built-in international payment methods

## 🔍 Real-time Monitoring

The server logs all API interactions:

```
[Partner] Processing direct payment for order: ORD_123456
[Partner] Using Goodpass API: https://partner-api.goodpass.club/v1/payments/direct/process
[Partner] Payment status: requires_action, Intent ID: pi_xxx
```

## 🌐 Environment Configuration

```env
# Real Goodpass API endpoint
GOODPASS_API_URL=https://partner-api.goodpass.club/v1

# Your UAT API key
PARTNER_API_KEY=gp_wC67T...TNa4

# Application settings
PORT=5010
NODE_ENV=development
```

### Stripe Configuration

The demo fetches the Stripe publishable key dynamically from the Goodpass API:

```javascript
// Fetch publishable key from Goodpass API
const response = await fetch('/api/v1/payments/config', {
  headers: {
    Authorization: 'Bearer YOUR_API_KEY',
  },
});

const config = await response.json();
const stripe = Stripe(config.publishableKey);
```

## 📋 Testing Results

### **API Endpoints Working:**

- ✅ `POST /v1/payments/direct/process` - Direct payment processing with Stripe.js
- ✅ `GET /v1/payments/direct/status/:paymentIntentId` - Direct payment status checking
- ✅ `POST /v1/payments/hosted/create-session` - Hosted payment sessions
- ✅ `GET /v1/payments/hosted/session/:sessionId` - Hosted session status checking
- ✅ `GET /v1/payments/history` - Payment history with filtering
- ✅ `GET /v1/payments/return` - 3D Secure return handling
- ✅ Authentication via existing partner API keys

### **Demo Functionality:**

- ✅ **Live API Integration** - Connects to real Goodpass backend
- ✅ **Dynamic UI Adaptation** - Changes based on partner PCI status
- ✅ **Security Demonstration** - Shows proper key handling
- ✅ **Fallback Handling** - Graceful degradation with mock data

## 🏆 Key Architectural Insights

### **From [Stripe's PCI Documentation](https://stripe.com/guides/pci-compliance):**

1. **"Low Risk Integrations"** - Using tokenization and hosted solutions reduces PCI obligations
2. **"Out-of-Scope Data"** - Card type, last 4 digits, expiration can be safely stored
3. **"Secure Transmission"** - Stripe.js ensures payment data goes directly to Stripe

## 🤝 Support

- Check `quick-test.http` for detailed curl examples
- Check the browser console for JavaScript errors
- Verify the order code exists in Goodpass system
- Ensure the API server is running on port 5010
- Contact Goodpass support for API-related issues

---

**🎉 Status**: ✅ **Ready for Integration** - Real API calls working with proper authentication

This implementation successfully addresses all requirements:

- ✅ **Security First** - No security compromise for any party
- ✅ **Flexibility** - Supports partners at different compliance levels
- ✅ **Future-Proof** - Easy to expand and enhance
- ✅ **Cost-Effective** - Minimal PCI burden on Goodpass
- ✅ **Developer-Friendly** - Clear, well-documented APIs

The hybrid approach gives you the **best of both worlds**: maximum security for non-PCI partners and maximum flexibility for PCI-compliant partners, while keeping Goodpass's compliance obligations minimal. 🎉
