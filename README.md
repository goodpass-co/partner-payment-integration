# Partner Payment Integration Sample

This sample project demonstrates how **Partner** can integrate with **Goodpass Payment APIs** to process payments using both direct (Stripe.js) and hosted (Stripe Checkout) flows. The integration uses **real Goodpass APIs** in test mode with Stripe test cards.

## 🔥 Real API Integration

This sample connects to the **actual Goodpass Partner API** at `https://partner-api.goodpass.club/v1` using your UAT API key. All payment processing goes through the real Stripe test environment.

## Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Server runs on http://localhost:5010
```

## 🧪 Testing the Integration

### 1. View Demo Scenarios

```bash
curl http://localhost:5010/api/v1/demo/scenarios
```

### 2. View Integration Guide

Open your browser to: http://localhost:5010/api/v1/demo/integration-guide

### 3. Test Payment Flow

```bash
# Test successful direct payment (requires valid order)
curl -X POST http://localhost:5010/api/v1/demo/test-payment \
  -H "Content-Type: application/json" \
  -d '{"scenario": "success", "orderCode": "GP1C24EECBAC"}'

# Test 3D Secure payment
curl -X POST http://localhost:5010/api/v1/demo/test-payment \
  -H "Content-Type: application/json" \
  -d '{"scenario": "threeDSecure", "orderCode": "GP1C24EECBAC"}'
```

## 📋 Order Creation Requirement

**Important**: The Goodpass API requires orders to be created in their system before payment processing. The typical workflow is:

1. **Create Order** (via Goodpass Order API or admin panel)
2. **Initialize Payment** (this sample)
3. **Handle 3D Secure** (automatic via webhooks)
4. **Check Payment Status** (this sample)

For testing purposes, you'll need to:

- Create test orders through the Goodpass admin panel, OR
- Use the Goodpass Order creation API first, OR
- Contact Goodpass to set up test orders with your partner code

## 🔑 Authentication

The sample uses your UAT API key: `gp_wC67T...TNa4`

All API calls include the proper `Authorization: Bearer` header.

## 💳 Test Cards (Stripe Test Mode)

- **Success (no 3DS)**: `pm_card_visa`
- **3D Secure Required**: `pm_card_threeDSecure2Required`
- **Declined**: `pm_card_visa_chargeDeclined`

## 🔄 Payment Flows

### Direct Payment Flow (Stripe.js)

```
1. POST /api/v1/payments/direct/process
   ↓ (if successful immediately)
2. Payment complete
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
1. POST /api/v1/payments/hosted/create-session
   ↓
2. Redirect to Stripe Checkout
   ↓ (customer completes payment)
3. Customer returns to success/cancel URL
   ↓ (payment completed automatically)
4. GET /api/v1/payments/hosted/session/:sessionId (verify)
```

## 📡 API Endpoints

### Direct Payments (Stripe.js Integration)

- `POST /api/v1/payments/direct/process` - Process payment with PaymentMethod token
- `GET /api/v1/payments/direct/status/:paymentIntentId` - Check direct payment status

### Hosted Payments (Stripe Checkout)

- `POST /api/v1/payments/hosted/create-session` - Create checkout session
- `GET /api/v1/payments/hosted/session/:sessionId` - Check session status

### Shared Resources

- `GET /api/v1/payments/history` - Payment history
- `GET /api/v1/payments/return` - 3DS return handler (direct payments only)

### Demo & Testing

- `GET /api/v1/demo/scenarios` - Available test scenarios
- `POST /api/v1/demo/test-payment` - Run test scenarios
- `GET /api/v1/demo/integration-guide` - Interactive guide

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

## 🔍 Real-time Monitoring

The server logs all API interactions:

```
[Partner] Processing direct payment for order: ORD_123456
[Partner] Using Goodpass API: https://partner-api.goodpass.club/v1/payments/direct/process
[Partner] Payment status: requires_action, Intent ID: pi_xxx
```

## 🆕 Current Implementation Features

- **Organized Endpoints**: Separated direct vs hosted payment flows
- **Automatic 3D Secure**: 3D Secure handled automatically without manual completion
- **Real API Integration**: Direct connection to Goodpass Partner API
- **Comprehensive Testing**: Demo endpoints with multiple test scenarios
- **Error Handling**: Robust error handling and validation
- **TypeScript**: Full type safety with comprehensive interfaces

## 📚 Next Steps

1. **Order Integration**: Implement order creation API calls
2. **Choose Payment Flow**: Decide between direct (Stripe.js) or hosted (Checkout)
3. **3D Secure Handling**: Implement proper redirect flow in your frontend
4. **Webhook Integration**: Set up payment status webhooks (recommended)
5. **Error Handling**: Implement proper error handling for your use cases
6. **Production Setup**: Switch to production API keys and endpoints

## 🤝 Support

- Check `test-examples/` folder for detailed integration examples
- Review `INTEGRATION_SUMMARY.md` for complete implementation details
- See `DEPLOYMENT_GUIDE.md` for production deployment instructions

---

**Status**: ✅ **Ready for Integration** - Real API calls working with proper authentication
# partner-payment-integration
