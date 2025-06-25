import express from 'express';
import axios, { AxiosError } from 'axios';

const router = express.Router();

// API Configuration
const GOODPASS_API_URL = process.env.GOODPASS_API_URL;
const API_KEY = process.env.PARTNER_API_KEY;

console.log('GOODPASS_API_URL: in payments.ts', GOODPASS_API_URL);

// Create axios instance with default configuration
const goodpassAPI = axios.create({
  baseURL: GOODPASS_API_URL,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Payment Status Enum
enum PaymentStatus {
  SUCCEEDED = 'succeeded',
  REQUIRES_ACTION = 'requires_action',
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  PROCESSING = 'processing',
  CANCELED = 'canceled',
  FAILED = 'failed',
}

// Gateway Enum
enum PaymentGateway {
  STRIPE = 'STRIPE',
  ADYEN = 'ADYEN',
}

// Payment Method Types
enum PaymentMethodType {
  CARD = 'card',
  WALLET = 'wallet',
  BANK_TRANSFER = 'bank_transfer',
}

// 3D Secure Types
enum ThreeDSecureType {
  FORM = 'FORM',
  REDIRECT = 'REDIRECT',
  IFRAME = 'IFRAME',
}

// Interfaces for type safety
interface PaymentMethod {
  type: PaymentMethodType;
  token: string;
  cardBrand?: string;
  cardCountry?: string;
  last4?: string;
}

interface DirectPaymentRequest {
  orderCode: string;
  paymentMethod: PaymentMethod;
  returnUrl?: string;
  clientIp?: string;
  userAgent?: string;
}

interface HostedPaymentRequest {
  orderCode: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

interface ThreeDSecureInfo {
  type: ThreeDSecureType;
  url: string;
  payload?: Record<string, any>;
  paymentIntentClientSecret?: string;
}

interface DirectPaymentResponse {
  gateway: PaymentGateway;
  paymentIntentId: string;
  status: PaymentStatus;
  threeDSecure?: ThreeDSecureInfo;
  order?: {
    orderCode: string;
    totalAmount: number;
    currency: string;
  };
  error?: {
    code: string;
    message: string;
    declineCode?: string;
  };
}

interface HostedPaymentResponse {
  sessionId: string;
  checkoutUrl: string;
  order?: {
    orderCode: string;
    totalAmount: number;
    currency: string;
  };
}

// Error handling utility
const handleAPIError = (error: AxiosError, res: express.Response) => {
  console.error('Goodpass API Error:', error.response?.data || error.message);

  if (error.response) {
    return res.status(error.response.status).json({
      success: false,
      error: {
        code: `API_ERROR_${error.response.status}`,
        message: error.response.data || 'API request failed',
        details: error.response.data,
      },
    });
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Payment service is currently unavailable',
      },
    });
  }

  return res.status(500).json({
    success: false,
    error: {
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to payment service',
    },
  });
};

// ================================
// DIRECT PAYMENTS
// ================================
// Use when you want to control the payment experience with Stripe.js on your frontend

/**
 * POST /api/v1/payments/direct/process
 *
 * Process a direct payment using a Stripe PaymentMethod token.
 * This may return immediately for non-3D Secure cards, or require additional authentication.
 */
router.post('/direct/process', async (req, res) => {
  try {
    const {
      orderCode,
      paymentMethod,
      returnUrl,
      clientIp,
      userAgent,
    }: DirectPaymentRequest = req.body;

    // Validate required fields
    if (!orderCode) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORDER_CODE',
          message: 'orderCode is required',
        },
      });
    }

    if (!paymentMethod || !paymentMethod.token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PAYMENT_METHOD',
          message: 'paymentMethod.token is required',
        },
      });
    }

    console.log(`[Partner] Processing direct payment for order: ${orderCode}`);
    console.log(
      `[Partner] Using Goodpass API: ${GOODPASS_API_URL}/payments/direct/process`
    );

    // Call Goodpass Partner API
    const response = await goodpassAPI.post<DirectPaymentResponse>(
      '/payments/direct/process',
      {
        orderCode,
        paymentMethod,
        returnUrl:
          returnUrl ||
          `${req.protocol}://${req.get('host')}/api/v1/payments/return`,
        clientIp: clientIp || req.ip,
        userAgent: userAgent || req.get('User-Agent'),
      }
    );

    const paymentResult = response.data;

    console.log(
      `[Partner] Payment status: ${paymentResult.status}, Intent ID: ${paymentResult.paymentIntentId}`
    );

    // Return standardized response
    res.json({
      success: true,
      data: {
        paymentIntentId: paymentResult.paymentIntentId,
        status: paymentResult.status,
        gateway: paymentResult.gateway,

        // Include 3D Secure details if authentication is required
        ...(paymentResult.status === PaymentStatus.REQUIRES_ACTION &&
        paymentResult.threeDSecure
          ? {
              threeDSecure: {
                required: true,
                type: paymentResult.threeDSecure.type,
                authenticationUrl: paymentResult.threeDSecure.url,
                clientSecret:
                  paymentResult.threeDSecure.paymentIntentClientSecret,
              },
            }
          : { threeDSecure: { required: false } }),

        order: paymentResult.order,

        // Include error details if payment failed
        ...(paymentResult.error ? { error: paymentResult.error } : {}),
      },
    });
  } catch (error) {
    handleAPIError(error as AxiosError, res);
  }
});

/**
 * GET /api/v1/payments/direct/status/:paymentIntentId
 *
 * Get the current status of a direct payment.
 * Use this to check payment status after 3D Secure authentication or webhook processing.
 */
router.get('/direct/status/:paymentIntentId', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PAYMENT_INTENT_ID',
          message: 'paymentIntentId is required',
        },
      });
    }

    console.log(
      `[Partner] Checking direct payment status for intent: ${paymentIntentId}`
    );

    // Call Goodpass Partner API
    const response = await goodpassAPI.get(
      `/payments/direct/status/${paymentIntentId}`
    );
    const paymentStatus = response.data;

    console.log(`[Partner] Payment status retrieved: ${paymentStatus.status}`);

    res.json({
      success: true,
      data: paymentStatus,
    });
  } catch (error) {
    handleAPIError(error as AxiosError, res);
  }
});

// ================================
// HOSTED PAYMENTS
// ================================
// Use when you want Stripe to handle the entire payment experience

/**
 * POST /api/v1/payments/hosted/create-session
 *
 * Create a hosted payment session (Stripe Checkout).
 * Customer will be redirected to Stripe's secure payment page.
 */
router.post('/hosted/create-session', async (req, res) => {
  try {
    const {
      orderCode,
      successUrl,
      cancelUrl,
      customerEmail,
    }: HostedPaymentRequest = req.body;

    // Validate required fields
    if (!orderCode) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORDER_CODE',
          message: 'orderCode is required',
        },
      });
    }

    if (!successUrl || !cancelUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_URLS',
          message: 'successUrl and cancelUrl are required',
        },
      });
    }

    console.log(
      `[Partner] Creating hosted payment session for order: ${orderCode}`
    );

    // Call Goodpass Partner API
    const response = await goodpassAPI.post<HostedPaymentResponse>(
      '/payments/hosted/create-session',
      {
        orderCode,
        successUrl,
        cancelUrl,
        customerEmail,
      }
    );

    const sessionResult = response.data;

    console.log(`[Partner] Hosted session created: ${sessionResult.sessionId}`);

    res.json({
      success: true,
      data: {
        sessionId: sessionResult.sessionId,
        url: sessionResult.checkoutUrl,
        order: sessionResult.order,
      },
    });
  } catch (error) {
    handleAPIError(error as AxiosError, res);
  }
});

/**
 * GET /api/v1/payments/hosted/session/:sessionId
 *
 * Get the status of a hosted payment session.
 * Use this to check if the customer completed the payment.
 */
router.get('/hosted/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SESSION_ID',
          message: 'sessionId is required',
        },
      });
    }

    console.log(`[Partner] Checking hosted session status: ${sessionId}`);

    // Call Goodpass Partner API
    const response = await goodpassAPI.get(
      `/payments/hosted/session/${sessionId}`
    );
    const sessionStatus = response.data;

    console.log(`[Partner] Session status retrieved: ${sessionStatus.status}`);

    res.json({
      success: true,
      data: sessionStatus,
    });
  } catch (error) {
    handleAPIError(error as AxiosError, res);
  }
});

// ================================
// SHARED RESOURCES
// ================================

/**
 * GET /api/v1/payments/history
 *
 * Get payment history with optional filtering.
 */
router.get('/history', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      orderCode,
      dateFrom,
      dateTo,
    } = req.query;

    console.log(
      `[Partner] Fetching payment history - page: ${page}, limit: ${limit}`
    );

    // Build query parameters
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) params.append('status', status.toString());
    if (orderCode) params.append('orderCode', orderCode.toString());
    if (dateFrom) params.append('dateFrom', dateFrom.toString());
    if (dateTo) params.append('dateTo', dateTo.toString());

    // Call Goodpass Partner API
    const response = await goodpassAPI.get(`/payments/history?${params}`);
    const paymentHistory = response.data;

    console.log(
      `[Partner] Retrieved ${paymentHistory.data?.length || 0} payment records`
    );

    res.json({
      success: true,
      data: paymentHistory,
    });
  } catch (error) {
    handleAPIError(error as AxiosError, res);
  }
});

/**
 * GET /api/v1/payments/return
 *
 * Handle return from 3D Secure authentication.
 * This is where customers are redirected after completing 3D Secure authentication.
 */
router.get('/return', async (req, res) => {
  const { payment_intent, payment_intent_client_secret, redirect_status } =
    req.query;

  console.log(
    `[Partner] Payment return - Intent: ${payment_intent}, Status: ${redirect_status}`
  );

  // In a real implementation, you would:
  // 1. Verify the payment intent with Goodpass
  // 2. Update your internal order status
  // 3. Redirect to your success/failure page

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Partner - Payment Return</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
            .success { color: #2e7d32; background: #e8f5e9; padding: 15px; border-radius: 4px; }
            .processing { color: #f57c00; background: #fff3e0; padding: 15px; border-radius: 4px; }
            .failed { color: #d32f2f; background: #ffebee; padding: 15px; border-radius: 4px; }
            .api-note { background: #e3f2fd; color: #1565c0; padding: 10px; border-radius: 4px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <h1>Partner Payment Processing</h1>
        <div class="${
          redirect_status === 'succeeded'
            ? 'success'
            : redirect_status === 'failed'
            ? 'failed'
            : 'processing'
        }">
            <h3>Payment Status: ${redirect_status || 'processing'}</h3>
            <p><strong>Payment Intent:</strong> ${payment_intent}</p>
            <p>Please wait while we verify your payment with Goodpass...</p>
        </div>
        
        <div class="api-note">
            <strong>Real API Integration:</strong> This demonstrates the actual 3D Secure flow with Goodpass and Stripe. 
            The payment is being processed through the real payment gateway.
        </div>
        
        <h3>Next Steps for Integration:</h3>
        <ol>
            <li>Call <code>GET /api/v1/payments/direct/status/${payment_intent}</code> to verify the final payment status</li>
            <li>Update your order status based on the payment result</li>
            <li>Redirect customer to appropriate success/failure page</li>
        </ol>
        
        <script>
            // Auto-check payment status after 3 seconds
            setTimeout(() => {
                if ('${payment_intent}') {
                    fetch('/api/v1/payments/direct/status/${payment_intent}')
                        .then(response => response.json())
                        .then(data => {
                            console.log('Payment status check:', data);
                            if (data.success && data.data.status === 'succeeded') {
                                document.body.innerHTML += '<div class="success"><h3>✅ Payment Confirmed!</h3><p>Your payment has been successfully processed.</p></div>';
                            } else if (data.data.status === 'failed') {
                                document.body.innerHTML += '<div class="failed"><h3>❌ Payment Failed</h3><p>Unfortunately, your payment could not be processed.</p></div>';
                            }
                        })
                        .catch(error => console.error('Error checking payment status:', error));
                }
            }, 3000);
        </script>
    </body>
    </html>
  `);
});

export default router;
