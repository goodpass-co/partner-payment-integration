# 🎯 Stripe.js Frontend Demo Setup Guide

This demo provides a comprehensive example of integrating Stripe.js frontend with Goodpass Partner Payment APIs, demonstrating both **Direct Payments** and **Hosted Payments** flows.

## 🚀 Quick Start

1. **Install dependencies** (if not already done):

   ```bash
   npm install
   ```

2. **Start the server**:

   ```bash
   npm run dev
   ```

3. **Open the demo** in your browser:
   ```
   http://localhost:5010/index.html
   ```

## 📋 Demo Features

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

## 🧪 Testing Scenarios

### Test Cards (Stripe Test Mode)

| Scenario      | Card Number           | Description                         |
| ------------- | --------------------- | ----------------------------------- |
| **Success**   | `4242 4242 4242 4242` | Immediate success without 3D Secure |
| **3D Secure** | `4000 0027 6000 3184` | Requires 3D Secure authentication   |
| **Decline**   | `4000 0000 0000 0002` | Card declined by bank               |

Use any **future expiry date** and any **3-digit CVC**.

### Order Codes for Testing

Use these valid order codes in the demo:

- `GP1C24EECBAC` (default in demo)
- Or create new orders via Goodpass admin panel
- For testing purposes, some endpoints may show "Order not found" errors which confirm API connectivity

## 🔄 Payment Flows Demonstrated

### Direct Payment Flow

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

### Hosted Payment Flow

```
1. 🛒 Frontend calls /payments/hosted/create-session
2. 🔗 Redirect user to Stripe Checkout URL
3. 💳 User completes payment on Stripe's page
4. ↩️ Stripe redirects back to success/cancel URL
5. ✅ Verify payment completion via session status
```

## 🔧 Configuration

### Environment Variables

The demo uses these environment variables (already configured):

```env
GOODPASS_API_URL=https://partner-api.goodpass.club/v1
PARTNER_API_KEY=gp_wC67T...TNa4
PORT=5010
```

### Stripe Configuration

The demo uses Stripe's **test publishable key**:

```javascript
const stripe = Stripe('pk_test_51Pj4OZ...');
```

## 📂 File Structure

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

## 🔍 Real-time Monitoring

The demo provides real-time feedback:

- ✅ **Success messages**: Green notifications for completed actions
- ⚠️ **Warning messages**: Yellow notifications for required actions
- ❌ **Error messages**: Red notifications for failures
- ℹ️ **Info messages**: Blue notifications for status updates

## 📱 Mobile Responsive

The demo is fully responsive and works on:

- 📱 **Mobile phones** (iOS/Android)
- 📱 **Tablets** (iPad/Android tablets)
- 💻 **Desktop browsers** (Chrome/Safari/Firefox/Edge)

## 🛠️ Integration Examples

### Direct Payment Integration

```javascript
// 1. Create payment method with Stripe.js
const { paymentMethod } = await stripe.createPaymentMethod({
  type: 'card',
  card: cardElement,
});

// 2. Process payment via Partner API
const response = await fetch('/api/v1/payments/direct/process', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    orderCode: 'GP1C24EECBAC',
    paymentMethod: {
      type: 'card',
      token: paymentMethod.id,
    },
    returnUrl: 'http://localhost:5010/payment-return.html',
  }),
});
```

### Hosted Payment Integration

```javascript
// 1. Create checkout session
const response = await fetch('/api/v1/payments/hosted/create-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    orderCode: 'GP1C24EECBAC',
    successUrl: 'http://localhost:5010/payment-success.html',
    cancelUrl: 'http://localhost:5010/payment-cancel.html',
  }),
});

// 2. Redirect to Stripe Checkout
const session = await response.json();
window.location.href = session.checkoutUrl;
```

## 🔒 Security Features

- ✅ **PCI Compliance**: Stripe.js ensures card data never touches your servers
- ✅ **3D Secure**: Automatic handling of Strong Customer Authentication
- ✅ **HTTPS**: All API calls use secure connections
- ✅ **Token-based**: PaymentMethod tokens instead of raw card data

## 🤝 Next Steps

1. **Test both payment flows** with different card scenarios
2. **Integrate with your frontend framework** (React, Vue, Angular)
3. **Implement webhook handling** for automatic status updates
4. **Add error handling** specific to your business logic
5. **Style the UI** to match your brand
6. **Deploy to production** with production API keys

## 📞 Support

If you encounter any issues:

- Check the browser console for JavaScript errors
- Verify the order code exists in Goodpass system
- Ensure the API server is running on port 5010
- Contact Goodpass support for API-related issues

---

**🎉 Ready to integrate!** This demo shows complete real-world payment flows that you can adapt for your production applications.
