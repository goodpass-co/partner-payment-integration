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
      token: 'pm_card_visa_chargeDeclined',
      cardBrand: 'visa',
      cardCountry: 'MY',
      last4: '0341',
    },
  },
};

// Helper function to determine next steps based on payment status
function getNextSteps(paymentData: any): string[] {
  const steps: string[] = [];

  switch (paymentData.status) {
    case 'succeeded':
      steps.push('✅ Payment completed successfully');
      steps.push('Send confirmation to customer');
      if (paymentData.receipt) {
        steps.push(`View receipt: ${paymentData.receipt.receiptUrl}`);
      }
      break;

    case 'requires_action':
      steps.push('🔐 3D Secure authentication required');
      steps.push(
        `Redirect customer to: {paymentData.threeDSecure?.authenticationUrl}`
      );
      steps.push('After authentication, check payment status again');
      steps.push(
        `Call GET /api/v1/payments/direct/status/${paymentData.paymentIntentId}`
      );
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
        `Call GET /api/v1/payments/direct/status/${paymentData.paymentIntentId}`
      );
      break;

    default:
      steps.push(`Payment status: ${paymentData.status}`);
      steps.push('Check Goodpass documentation for this status');
  }

  return steps;
}

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
          '5. For 3D Secure scenarios, complete authentication and check status',
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

    // Call our own direct payments API
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const response = await axios.post(
      `${baseUrl}/api/v1/payments/direct/process`,
      {
        orderCode,
        paymentMethod: testScenario.paymentMethod,
        returnUrl: `${baseUrl}/api/v1/payments/return`,
        clientIp: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );

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
 * POST /api/v1/demo/check-payment-status
 *
 * Check the status of a payment (replaces the old complete endpoint).
 */
router.post('/check-payment-status', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'paymentIntentId is required',
        },
      });
    }

    console.log(
      `[Partner Demo] Checking payment status for intent: ${paymentIntentId}`
    );

    // Call our own direct payment status API
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const response = await axios.get(
      `${baseUrl}/api/v1/payments/direct/status/${paymentIntentId}`
    );

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
      '[Partner Demo] Check payment status error:',
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      error: {
        code: 'CHECK_PAYMENT_STATUS_FAILED',
        message: 'Failed to check payment status',
        details: error.response?.data || error.message,
      },
    });
  }
});

/**
 * POST /api/v1/demo/test-hosted-payment
 *
 * Test hosted payment flow (Stripe Checkout).
 */
router.post('/test-hosted-payment', async (req, res) => {
  try {
    const { orderCode } = req.body;

    if (!orderCode) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'orderCode is required',
        },
      });
    }

    console.log(
      `[Partner Demo] Testing hosted payment for order: ${orderCode}`
    );

    // Call our own hosted payments API
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const response = await axios.post(
      `${baseUrl}/api/v1/payments/hosted/create-session`,
      {
        orderCode,
        successUrl: `${baseUrl}/payment-success.html`,
        cancelUrl: `${baseUrl}/payment-cancel.html`,
      }
    );

    const sessionResult = response.data;

    res.json({
      success: true,
      data: {
        scenario: {
          name: 'hosted_checkout',
          title: 'Hosted Payment (Stripe Checkout)',
          description: 'Customer will be redirected to Stripe Checkout page',
        },
        session: sessionResult.data,
        nextSteps: [
          '🔗 Redirect customer to Stripe Checkout',
          `Open: ${sessionResult.data.url}`,
          "Customer completes payment on Stripe's secure page",
          `After payment, check session status: GET /api/v1/payments/hosted/session/${sessionResult.data.sessionId}`,
        ],
      },
    });
  } catch (error: any) {
    console.error(
      '[Partner Demo] Test hosted payment error:',
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      error: {
        code: 'TEST_HOSTED_PAYMENT_FAILED',
        message: 'Failed to create hosted payment session',
        details: error.response?.data || error.message,
      },
    });
  }
});

export default router;
