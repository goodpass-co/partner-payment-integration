import express from 'express';
import axios from 'axios';

const router = express.Router();

// Demo test cards and scenarios
const TEST_SCENARIOS = {
  success: {
    title: 'Successful Payment (No 3D Secure)',
    description:
      'Payment succeeds immediately without requiring 3D Secure authentication',
    paymentMethod: {
      type: 'card',
      token: 'pm_card_visa',
      cardBrand: 'visa',
      cardCountry: 'MY',
      last4: '4242',
    },
  },
  threeDSecure: {
    title: '3D Secure Required',
    description: 'Payment requires 3D Secure authentication before completion',
    paymentMethod: {
      type: 'card',
      token: 'pm_card_threeDSecure2Required',
      cardBrand: 'visa',
      cardCountry: 'MY',
      last4: '0002',
    },
  },
  declined: {
    title: 'Card Declined',
    description: 'Payment fails due to card being declined',
    paymentMethod: {
      type: 'card',
      token: 'pm_card_visa_debit_declined',
      cardBrand: 'visa',
      cardCountry: 'MY',
      last4: '0341',
    },
  },
};

/**
 * GET /api/v1/demo/scenarios
 *
 * Get available test scenarios for payment integration testing.
 */
router.get('/scenarios', (req, res) => {
  res.json({
    success: true,
    data: {
      scenarios: TEST_SCENARIOS,
      usage: {
        description:
          'Use these test scenarios to verify your payment integration',
        steps: [
          '1. Create a test order using the orders API',
          '2. Choose a payment scenario from the list above',
          '3. Call POST /api/v1/demo/test-payment with the scenario and order code',
          '4. Follow the payment flow based on the response',
          '5. For 3D Secure scenarios, complete authentication and call complete endpoint',
        ],
      },
    },
  });
});

/**
 * POST /api/v1/demo/test-payment
 *
 * Run a test payment with a specific scenario.
 */
router.post('/test-payment', async (req, res) => {
  try {
    const { scenario, orderCode } = req.body;

    if (!scenario || !orderCode) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'scenario and orderCode are required',
        },
      });
    }

    const testScenario =
      TEST_SCENARIOS[scenario as keyof typeof TEST_SCENARIOS];
    if (!testScenario) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SCENARIO',
          message: `Invalid scenario. Available scenarios: ${Object.keys(
            TEST_SCENARIOS
          ).join(', ')}`,
        },
      });
    }

    console.log(
      `[Partner Demo] Testing ${testScenario.title} for order: ${orderCode}`
    );

    // Call our own payments API
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const response = await axios.post(`${baseUrl}/api/v1/payments/begin`, {
      orderCode,
      paymentMethod: testScenario.paymentMethod,
      returnUrl: `${baseUrl}/api/v1/payments/return`,
      clientIp: req.ip,
      userAgent: req.get('User-Agent'),
    });

    const paymentResult = response.data;

    res.json({
      success: true,
      data: {
        scenario: {
          name: scenario,
          title: testScenario.title,
          description: testScenario.description,
        },
        payment: paymentResult.data,
        nextSteps: getNextSteps(paymentResult.data),
      },
    });
  } catch (error: any) {
    console.error(
      '[Partner Demo] Test payment error:',
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      error: {
        code: 'TEST_PAYMENT_FAILED',
        message: 'Failed to execute test payment',
        details: error.response?.data || error.message,
      },
    });
  }
});

/**
 * POST /api/v1/demo/complete-test-payment
 *
 * Complete a test payment (for 3D Secure scenarios).
 */
router.post('/complete-test-payment', async (req, res) => {
  try {
    const { orderCode, paymentIntentId } = req.body;

    if (!orderCode || !paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'orderCode and paymentIntentId are required',
        },
      });
    }

    console.log(
      `[Partner Demo] Completing test payment for order: ${orderCode}`
    );

    // Call our own payments API
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const response = await axios.post(`${baseUrl}/api/v1/payments/complete`, {
      orderCode,
      paymentIntentId,
    });

    const paymentResult = response.data;

    res.json({
      success: true,
      data: {
        payment: paymentResult.data,
        nextSteps: getNextSteps(paymentResult.data),
      },
    });
  } catch (error: any) {
    console.error(
      '[Partner Demo] Complete test payment error:',
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      error: {
        code: 'COMPLETE_TEST_PAYMENT_FAILED',
        message: 'Failed to complete test payment',
        details: error.response?.data || error.message,
      },
    });
  }
});

/**
 * GET /api/v1/demo/integration-guide
 *
 * Get integration guide and documentation.
 */
router.get('/integration-guide', (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'Partner Payment Integration Guide',
      overview:
        'This guide shows how to integrate Goodpass payment APIs with 3D Secure support',

      steps: {
        '1_setup': {
          title: 'Setup & Authentication',
          description: 'Configure your API credentials and endpoints',
          code: `
// Environment setup
GOODPASS_API_URL=https://partner-api.goodpass.co/partner/v1
PARTNER_API_KEY=gp_wC67T...TNa4

// API Headers
headers: {
  'Authorization': 'Bearer ' + PARTNER_API_KEY,
  'Content-Type': 'application/json'
}
          `,
        },

        '2_begin_payment': {
          title: 'Begin Payment',
          description: 'Start the payment process for an order',
          endpoint: 'POST /api/v1/payments/begin',
          code: `
const paymentRequest = {
  orderCode: 'ORD_123456',
  paymentMethod: {
    type: 'card',
    token: 'pm_card_visa', // From Stripe.js or Adyen Drop-in
    cardBrand: 'visa',
    cardCountry: 'MY',
    last4: '4242'
  },
  returnUrl: 'https://your-site.com/payment/return',
  clientIp: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
};

const response = await fetch('/api/v1/payments/begin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(paymentRequest)
});
          `,
        },

        '3_handle_response': {
          title: 'Handle Payment Response',
          description:
            'Process the payment response and handle 3D Secure if required',
          code: `
const result = await response.json();

if (result.data.status === 'succeeded') {
  // Payment succeeded immediately
  showSuccessPage(result.data.order);
  
} else if (result.data.status === 'requires_action') {
  // 3D Secure authentication required
  if (result.data.threeDSecure.type === 'REDIRECT') {
    // Redirect customer to 3D Secure page
    window.location.href = result.data.threeDSecure.authenticationUrl;
  }
  
} else if (result.data.status === 'failed') {
  // Payment failed
  showErrorPage(result.data.error);
}
          `,
        },

        '4_complete_payment': {
          title: 'Complete Payment (After 3D Secure)',
          description: 'Complete the payment after 3D Secure authentication',
          endpoint: 'POST /api/v1/payments/complete',
          code: `
// After customer returns from 3D Secure authentication
const completeRequest = {
  orderCode: 'ORD_123456',
  paymentIntentId: 'pi_1MqLaS2eZvKYlo2C...'
};

const response = await fetch('/api/v1/payments/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(completeRequest)
});

const result = await response.json();
if (result.data.status === 'succeeded') {
  showSuccessPage(result.data.order, result.data.receipt);
}
          `,
        },

        '5_check_status': {
          title: 'Check Payment Status',
          description: 'Verify payment status at any time',
          endpoint: 'GET /api/v1/payments/status/:paymentIntentId',
          code: `
const response = await fetch('/api/v1/payments/status/pi_1MqLaS2eZvKYlo2C...');
const result = await response.json();

console.log('Payment Status:', result.data.status);
console.log('Order Code:', result.data.orderCode);
console.log('Amount:', result.data.amount, result.data.currency);
          `,
        },
      },

      testCards: {
        title: 'Test Payment Methods',
        description:
          'Use these test tokens to simulate different payment scenarios',
        cards: TEST_SCENARIOS,
      },

      webhooks: {
        title: 'Payment Webhooks (Optional)',
        description:
          'Set up webhooks to receive real-time payment notifications',
        note: 'Contact Goodpass support to configure webhook endpoints for your partner account',
      },
    },
  });
});

// Helper function to determine next steps based on payment status
function getNextSteps(paymentData: any): string[] {
  const steps: string[] = [];

  switch (paymentData.status) {
    case 'succeeded':
      steps.push('✅ Payment completed successfully');
      steps.push('Update your order status to "paid"');
      steps.push('Send confirmation to customer');
      if (paymentData.receipt) {
        steps.push(`View receipt: ${paymentData.receipt.receiptUrl}`);
      }
      break;

    case 'requires_action':
      steps.push('🔐 3D Secure authentication required');
      steps.push(
        `Redirect customer to: ${paymentData.threeDSecure?.authenticationUrl}`
      );
      steps.push('After authentication, call POST /api/v1/payments/complete');
      break;

    case 'failed':
      steps.push('❌ Payment failed');
      steps.push('Display error message to customer');
      steps.push('Allow customer to try different payment method');
      if (paymentData.error) {
        steps.push(`Error: ${paymentData.error.message}`);
      }
      break;

    case 'processing':
      steps.push('⏳ Payment is being processed');
      steps.push('Check status again in a few seconds');
      steps.push(
        `Call GET /api/v1/payments/status/${paymentData.paymentIntentId}`
      );
      break;

    default:
      steps.push(`Payment status: ${paymentData.status}`);
      steps.push('Check Goodpass documentation for this status');
  }

  return steps;
}

export default router;
