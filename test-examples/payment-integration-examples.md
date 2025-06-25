# Partner Payment Integration Examples

This document provides practical examples for integrating Goodpass payment APIs into Partner's systems.

## Table of Contents

1. [Direct Payment Flow](#direct-payment-flow)
2. [Hosted Payment Flow](#hosted-payment-flow)
3. [3D Secure Integration](#3d-secure-integration)
4. [Error Handling](#error-handling)
5. [Frontend Examples](#frontend-examples)
6. [Backend Examples](#backend-examples)
7. [Testing Scenarios](#testing-scenarios)

## Direct Payment Flow

Use direct payments when you want to control the payment experience with Stripe.js on your frontend.

### 1. Standard Direct Payment (No 3D Secure)

```bash
# Test a successful payment
curl -X POST http://localhost:5010/api/v1/payments/direct/process \
  -H "Content-Type: application/json" \
  -d '{
    "orderCode": "ORD_TEST_001",
    "paymentMethod": {
      "type": "card",
      "token": "pm_card_visa",
      "cardBrand": "visa",
      "cardCountry": "MY",
      "last4": "4242"
    },
    "returnUrl": "http://localhost:5010/api/v1/payments/return",
    "clientIp": "192.168.1.1",
    "userAgent": "Partner-Test-Client/1.0"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_1234567890",
    "status": "succeeded",
    "gateway": "STRIPE",
    "threeDSecure": {
      "required": false
    },
    "order": {
      "orderCode": "ORD_TEST_001",
      "totalAmount": 228,
      "currency": "MYR"
    }
  }
}
```

### 2. Check Direct Payment Status

```bash
# Check the status of a payment
curl -X GET http://localhost:5010/api/v1/payments/direct/status/pi_1234567890
```

## Hosted Payment Flow

Use hosted payments when you want Stripe to handle the entire payment experience.

### 1. Create Hosted Payment Session

```bash
# Create a hosted payment session
curl -X POST http://localhost:5010/api/v1/payments/hosted/create-session \
  -H "Content-Type: application/json" \
  -d '{
    "orderCode": "ORD_HOSTED_001",
    "successUrl": "https://yoursite.com/success",
    "cancelUrl": "https://yoursite.com/cancel",
    "customerEmail": "customer@example.com"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_abc123def456",
    "url": "https://checkout.stripe.com/c/pay/cs_test_abc123def456",
    "order": {
      "orderCode": "ORD_HOSTED_001",
      "totalAmount": 228,
      "currency": "MYR"
    }
  }
}
```

### 2. Check Hosted Session Status

```bash
# Check the status of a hosted session
curl -X GET http://localhost:5010/api/v1/payments/hosted/session/cs_test_abc123def456
```

## 3D Secure Integration

### 1. Begin 3D Secure Direct Payment

```bash
# Test a 3D Secure required payment
curl -X POST http://localhost:5010/api/v1/payments/direct/process \
  -H "Content-Type: application/json" \
  -d '{
    "orderCode": "ORD_3DS_001",
    "paymentMethod": {
      "type": "card",
      "token": "pm_card_threeDSecure2Required",
      "cardBrand": "visa",
      "cardCountry": "MY",
      "last4": "0002"
    },
    "returnUrl": "http://localhost:5010/api/v1/payments/return",
    "clientIp": "192.168.1.1"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_3ds_1234567890",
    "status": "requires_action",
    "gateway": "STRIPE",
    "threeDSecure": {
      "required": true,
      "type": "REDIRECT",
      "authenticationUrl": "https://hooks.stripe.com/redirect/authenticate/pi_3ds_1234567890",
      "clientSecret": "pi_3ds_1234567890_secret_xyz"
    },
    "order": {
      "orderCode": "ORD_3DS_001",
      "totalAmount": 150,
      "currency": "MYR"
    }
  }
}
```

### 2. Handle 3D Secure Flow

**Important:** The 3D Secure flow is now handled automatically by webhooks. After the customer completes authentication:

1. Stripe sends webhooks to Goodpass automatically
2. Payment status is updated in real-time
3. Check status using the direct status endpoint

```bash
# Check status after 3D Secure authentication
curl -X GET http://localhost:5010/api/v1/payments/direct/status/pi_3ds_1234567890
```

## Error Handling

### 1. Card Declined Scenario

```bash
# Test a declined card
curl -X POST http://localhost:5010/api/v1/payments/direct/process \
  -H "Content-Type: application/json" \
  -d '{
    "orderCode": "ORD_DECLINED_001",
    "paymentMethod": {
      "type": "card",
      "token": "pm_card_visa_chargeDeclined",
      "cardBrand": "visa",
      "cardCountry": "MY",
      "last4": "0341"
    }
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_declined_1234567890",
    "status": "failed",
    "gateway": "STRIPE",
    "threeDSecure": {
      "required": false
    },
    "order": {
      "orderCode": "ORD_DECLINED_001",
      "totalAmount": 100,
      "currency": "MYR"
    },
    "error": {
      "code": "card_declined",
      "message": "Your card was declined.",
      "declineCode": "generic_decline"
    }
  }
}
```

### 2. Invalid Request

```bash
# Test missing order code
curl -X POST http://localhost:5010/api/v1/payments/direct/process \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": {
      "type": "card",
      "token": "pm_card_visa"
    }
  }'
```

**Expected Response:**

```json
{
  "success": false,
  "error": {
    "code": "MISSING_ORDER_CODE",
    "message": "orderCode is required"
  }
}
```

## Frontend Examples

### React Integration

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const PaymentForm = ({ orderCode, amount, currency }) => {
  const [loading, setLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  const processDirectPayment = async (paymentMethod) => {
    setLoading(true);

    try {
      const response = await axios.post('/api/v1/payments/direct/process', {
        orderCode,
        paymentMethod,
        returnUrl: `${window.location.origin}/payment/return`,
      });

      const result = response.data;

      if (result.data.status === 'succeeded') {
        // Payment completed immediately
        setPaymentResult({
          status: 'success',
          message: 'Payment completed successfully!',
          order: result.data.order,
        });
      } else if (result.data.status === 'requires_action') {
        // Redirect to 3D Secure
        window.location.href = result.data.threeDSecure.authenticationUrl;
      } else if (result.data.status === 'failed') {
        // Payment failed
        setPaymentResult({
          status: 'error',
          message: result.data.error?.message || 'Payment failed',
          error: result.data.error,
        });
      }
    } catch (error) {
      setPaymentResult({
        status: 'error',
        message: 'Network error occurred',
        error: error.response?.data || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVisaPayment = () => {
    processDirectPayment({
      type: 'card',
      token: 'pm_card_visa',
      cardBrand: 'visa',
      cardCountry: 'MY',
      last4: '4242',
    });
  };

  const handle3DSecurePayment = () => {
    processDirectPayment({
      type: 'card',
      token: 'pm_card_threeDSecure2Required',
      cardBrand: 'visa',
      cardCountry: 'MY',
      last4: '0002',
    });
  };

  const createHostedSession = async () => {
    setLoading(true);

    try {
      const response = await axios.post(
        '/api/v1/payments/hosted/create-session',
        {
          orderCode,
          successUrl: `${window.location.origin}/payment/success`,
          cancelUrl: `${window.location.origin}/payment/cancel`,
        }
      );

      const result = response.data;
      // Redirect to Stripe Checkout
      window.location.href = result.data.url;
    } catch (error) {
      setPaymentResult({
        status: 'error',
        message: 'Failed to create payment session',
        error: error.response?.data || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-form">
      <h3>
        Pay {amount} {currency} for Order {orderCode}
      </h3>

      <div className="payment-methods">
        <h4>Direct Payments (Stripe.js)</h4>
        <button
          onClick={handleVisaPayment}
          disabled={loading}
          className="payment-btn success"
        >
          {loading ? 'Processing...' : 'Pay with Visa (Success)'}
        </button>

        <button
          onClick={handle3DSecurePayment}
          disabled={loading}
          className="payment-btn secure"
        >
          {loading ? 'Processing...' : 'Pay with 3D Secure'}
        </button>

        <h4>Hosted Payments (Stripe Checkout)</h4>
        <button
          onClick={createHostedSession}
          disabled={loading}
          className="payment-btn hosted"
        >
          {loading ? 'Creating Session...' : 'Pay with Stripe Checkout'}
        </button>
      </div>

      {paymentResult && (
        <div className={`result ${paymentResult.status}`}>
          <h4>
            {paymentResult.status === 'success' ? '✅ Success' : '❌ Error'}
          </h4>
          <p>{paymentResult.message}</p>
          {paymentResult.order && (
            <div>
              <p>Order: {paymentResult.order.orderCode}</p>
              <p>
                Amount: {paymentResult.order.totalAmount}{' '}
                {paymentResult.order.currency}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentForm;
```

### Payment Return Handler

```jsx
// PaymentReturn.jsx - Handle return from 3D Secure
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const PaymentReturn = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [result, setResult] = useState(null);

  useEffect(() => {
    const paymentIntent = searchParams.get('payment_intent');
    const redirectStatus = searchParams.get('redirect_status');

    if (paymentIntent) {
      // Check payment status (webhooks handle completion automatically)
      checkPaymentStatus(paymentIntent);
    }
  }, [searchParams]);

  const checkPaymentStatus = async (paymentIntentId) => {
    try {
      const response = await axios.get(
        `/api/v1/payments/direct/status/${paymentIntentId}`
      );

      const result = response.data;

      if (result.data.status === 'succeeded') {
        setStatus('success');
        setResult(result.data);
      } else if (result.data.status === 'failed') {
        setStatus('failed');
        setResult(result.data);
      } else {
        // Still processing, check again in a moment
        setTimeout(() => checkPaymentStatus(paymentIntentId), 2000);
      }
    } catch (error) {
      setStatus('error');
      setResult({ error: error.response?.data || error.message });
    }
  };

  return (
    <div className="payment-return">
      {status === 'processing' && (
        <div>
          <h2>⏳ Processing Payment</h2>
          <p>Please wait while we verify your payment...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="success">
          <h2>✅ Payment Successful!</h2>
          <p>Your payment has been processed successfully.</p>
          {result?.order && (
            <div>
              <p>
                <strong>Order:</strong> {result.order.orderCode}
              </p>
              <p>
                <strong>Amount:</strong> {result.order.totalAmount}{' '}
                {result.order.currency}
              </p>
              {result.receipt && (
                <p>
                  <a href={result.receipt.receiptUrl} target="_blank">
                    View Receipt
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {(status === 'failed' || status === 'error') && (
        <div className="error">
          <h2>❌ Payment Failed</h2>
          <p>Unfortunately, your payment could not be processed.</p>
          {result?.error && <p>Error: {result.error.message}</p>}
          <button onClick={() => window.history.back()}>Try Again</button>
        </div>
      )}
    </div>
  );
};

export default PaymentReturn;
```

## Backend Examples

### Express.js Service Class

```javascript
// payment-service.js
const axios = require('axios');

class PartnerPaymentService {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.GOODPASS_API_URL,
      headers: {
        Authorization: `Bearer ${process.env.PARTNER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async processOrder(order, paymentMethod, userInfo) {
    try {
      // Step 1: Begin payment
      const paymentResponse = await this.client.post('/payments/begin', {
        orderCode: order.code,
        paymentMethod: {
          type: paymentMethod.type,
          token: paymentMethod.token,
          cardBrand: paymentMethod.cardBrand,
          cardCountry: paymentMethod.cardCountry,
          last4: paymentMethod.last4,
        },
        returnUrl: `${process.env.BASE_URL}/payment/return`,
        clientIp: userInfo.ip,
        userAgent: userInfo.userAgent,
      });

      const paymentData = paymentResponse.data;

      // Step 2: Store payment intent for tracking
      await this.savePaymentIntent({
        orderId: order.id,
        orderCode: order.code,
        paymentIntentId: paymentData.paymentIntentId,
        status: paymentData.status,
        gateway: paymentData.gateway,
        userId: userInfo.userId,
      });

      // Step 3: Return appropriate response
      return {
        success: true,
        paymentIntentId: paymentData.paymentIntentId,
        status: paymentData.status,
        requiresAction: paymentData.status === 'requires_action',
        authenticationUrl: paymentData.threeDSecure?.url,
        order: paymentData.order,
      };
    } catch (error) {
      console.error(
        'Payment processing error:',
        error.response?.data || error.message
      );
      throw new Error(
        `Payment failed: ${error.response?.data?.message || error.message}`
      );
    }
  }

  async completePayment(orderCode, paymentIntentId) {
    try {
      const response = await this.client.post('/payments/complete', {
        orderCode,
        paymentIntentId,
      });

      const result = response.data;

      // Update local order status
      await this.updateOrderStatus(orderCode, result.status, result);

      return result;
    } catch (error) {
      console.error(
        'Payment completion error:',
        error.response?.data || error.message
      );
      throw new Error(
        `Payment completion failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  async getPaymentStatus(paymentIntentId) {
    try {
      const response = await this.client.get(
        `/payments/status/${paymentIntentId}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get payment status: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  async getPaymentHistory(filters = {}) {
    try {
      const params = new URLSearchParams();

      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status) params.append('status', filters.status);
      if (filters.orderCode) params.append('orderCode', filters.orderCode);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await this.client.get(`/payments/history?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get payment history: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  // Helper methods (implement based on your database)
  async savePaymentIntent(data) {
    // Save to your database
    console.log('Saving payment intent:', data);
  }

  async updateOrderStatus(orderCode, status, paymentResult) {
    // Update order in your database
    console.log('Updating order status:', { orderCode, status, paymentResult });
  }
}

module.exports = PartnerPaymentService;
```

### Express.js Route Handler

```javascript
// payment-routes.js
const express = require('express');
const PartnerPaymentService = require('./payment-service');

const router = express.Router();
const paymentService = new PartnerPaymentService();

// Begin payment for an order
router.post('/process-payment', async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;

    // Get order details (from your database)
    const order = await getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Process payment
    const result = await paymentService.processOrder(order, paymentMethod, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user.id,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle return from 3D Secure
router.post('/complete-payment', async (req, res) => {
  try {
    const { orderCode, paymentIntentId } = req.body;

    const result = await paymentService.completePayment(
      orderCode,
      paymentIntentId
    );

    res.json({
      success: result.status === 'succeeded',
      status: result.status,
      order: result.order,
      receipt: result.receipt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment status
router.get('/payment-status/:paymentIntentId', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const status = await paymentService.getPaymentStatus(paymentIntentId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

## Testing Scenarios

### 1. Automated Test Suite

```javascript
// payment.test.js
const request = require('supertest');
const app = require('../app');

describe('Payment Integration Tests', () => {
  describe('POST /api/v1/payments/begin', () => {
    it('should succeed with valid visa card', async () => {
      const response = await request(app)
        .post('/api/v1/payments/begin')
        .send({
          orderCode: 'TEST_SUCCESS_001',
          paymentMethod: {
            type: 'card',
            token: 'pm_card_visa',
            cardBrand: 'visa',
            cardCountry: 'MY',
            last4: '4242',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('succeeded');
      expect(response.body.data.threeDSecure.required).toBe(false);
    });

    it('should require 3D Secure with appropriate card', async () => {
      const response = await request(app)
        .post('/api/v1/payments/begin')
        .send({
          orderCode: 'TEST_3DS_001',
          paymentMethod: {
            type: 'card',
            token: 'pm_card_threeDSecure2Required',
            cardBrand: 'visa',
            cardCountry: 'MY',
            last4: '0002',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('requires_action');
      expect(response.body.data.threeDSecure.required).toBe(true);
      expect(response.body.data.threeDSecure.authenticationUrl).toBeDefined();
    });

    it('should fail with declined card', async () => {
      const response = await request(app)
        .post('/api/v1/payments/begin')
        .send({
          orderCode: 'TEST_DECLINED_001',
          paymentMethod: {
            type: 'card',
            token: 'pm_card_visa_debit_declined',
            cardBrand: 'visa',
            cardCountry: 'MY',
            last4: '0341',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('failed');
      expect(response.body.data.error).toBeDefined();
    });

    it('should return 400 for missing order code', async () => {
      const response = await request(app)
        .post('/api/v1/payments/begin')
        .send({
          paymentMethod: {
            type: 'card',
            token: 'pm_card_visa',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_ORDER_CODE');
    });
  });

  describe('POST /api/v1/payments/complete', () => {
    it('should complete a 3D Secure payment', async () => {
      // First create a 3D Secure payment
      const beginResponse = await request(app)
        .post('/api/v1/payments/begin')
        .send({
          orderCode: 'TEST_3DS_COMPLETE_001',
          paymentMethod: {
            type: 'card',
            token: 'pm_card_threeDSecure2Required',
            cardBrand: 'visa',
            cardCountry: 'MY',
            last4: '0002',
          },
        });

      const paymentIntentId = beginResponse.body.data.paymentIntentId;

      // Then complete it
      const completeResponse = await request(app)
        .post('/api/v1/payments/complete')
        .send({
          orderCode: 'TEST_3DS_COMPLETE_001',
          paymentIntentId,
        });

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.success).toBe(true);
      // Note: The status might be 'succeeded' or 'failed' depending on the simulation
    });
  });
});
```

### 2. Load Testing with Artillery

```yaml
# load-test.yml
config:
  target: 'http://localhost:5010'
  phases:
    - duration: 60
      arrivalRate: 10
  variables:
    orderCode: 'LOAD_TEST_{{ $randomString() }}'

scenarios:
  - name: 'Payment Flow Test'
    flow:
      - post:
          url: '/api/v1/payments/begin'
          json:
            orderCode: '{{ orderCode }}'
            paymentMethod:
              type: 'card'
              token: 'pm_card_visa'
              cardBrand: 'visa'
              cardCountry: 'MY'
              last4: '4242'
          capture:
            - json: '$.data.paymentIntentId'
              as: 'paymentIntentId'
      - get:
          url: '/api/v1/payments/status/{{ paymentIntentId }}'
```

### 3. Manual Testing Checklist

```markdown
## Manual Testing Checklist

### Basic Payment Flow

- [ ] Successful payment with Visa card
- [ ] Successful payment with Mastercard
- [ ] Payment with invalid/expired card
- [ ] Payment with insufficient funds
- [ ] Payment with stolen/lost card

### 3D Secure Flow

- [ ] 3D Secure authentication required
- [ ] Successful 3D Secure completion
- [ ] Failed 3D Secure authentication
- [ ] 3D Secure timeout scenario
- [ ] Customer abandons 3D Secure flow

### Error Scenarios

- [ ] Invalid order code
- [ ] Missing payment method
- [ ] Network timeout
- [ ] Invalid API key
- [ ] Service unavailable

### Edge Cases

- [ ] Multiple payment attempts for same order
- [ ] Payment completion without begin
- [ ] Very large amounts
- [ ] International cards
- [ ] Different currencies
```

This comprehensive example guide should help Partner developers understand exactly how to integrate with the Goodpass payment APIs and handle all the various scenarios including 3D Secure authentication.
