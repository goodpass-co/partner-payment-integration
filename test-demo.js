#!/usr/bin/env node

/**
 * Demo Verification Script
 * Verifies that the Stripe.js frontend demo is properly set up
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 5010;
const BASE_URL = `http://localhost:${PORT}`;

console.log('🧪 Testing Goodpass Partner Payment Demo Setup...\n');

// Test cases
const tests = [
  {
    name: 'API Health Check',
    url: '/',
    expected: 'Partner Payment Integration Sample',
  },
  {
    name: 'Main Demo Page',
    url: '/index.html',
    expected: 'Goodpass Partner Payment Integration Demo',
  },
  {
    name: 'Payment Success Page',
    url: '/payment-success.html',
    expected: 'Payment Successful',
  },
  {
    name: 'Payment Cancel Page',
    url: '/payment-cancel.html',
    expected: 'Payment Cancelled',
  },
  {
    name: 'Payment Return Page',
    url: '/payment-return.html',
    expected: 'Authentication Complete',
  },
  {
    name: 'Direct Payment API',
    url: '/api/v1/payments/direct/process',
    method: 'POST',
    expected: 'missing', // Should fail with validation error
  },
];

function makeRequest(test) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: test.url,
      method: test.method || 'GET',
      headers:
        test.method === 'POST' ? { 'Content-Type': 'application/json' } : {},
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const success = data.includes(test.expected);
        resolve({
          name: test.name,
          success,
          status: res.statusCode,
          response: data.substring(0, 100) + (data.length > 100 ? '...' : ''),
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        name: test.name,
        success: false,
        error: err.message,
      });
    });

    if (test.method === 'POST') {
      req.write('{}');
    }

    req.end();
  });
}

async function runTests() {
  console.log(`Testing server at: ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `);

    const result = await makeRequest(test);

    if (result.success) {
      console.log('✅ PASS');
      passed++;
    } else {
      console.log('❌ FAIL');
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      } else {
        console.log(`   Status: ${result.status}`);
        console.log(`   Expected: "${test.expected}"`);
        console.log(`   Response: ${result.response}`);
      }
      failed++;
    }
  }

  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Demo is ready to use.');
    console.log(`\n🌐 Open your browser to: ${BASE_URL}/index.html`);
  } else {
    console.log(
      '\n⚠️  Some tests failed. Check server status and configuration.'
    );
    console.log('\n💡 Make sure to:');
    console.log('   1. Run "npm run dev" to start the server');
    console.log('   2. Ensure all HTML files are in the public/ directory');
    console.log('   3. Check that static file serving is enabled');
  }
}

// Check if files exist
console.log('📁 Checking demo files...');
const requiredFiles = [
  'public/index.html',
  'public/payment-success.html',
  'public/payment-cancel.html',
  'public/payment-return.html',
];

let missingFiles = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    missingFiles.push(file);
  }
}

if (missingFiles.length > 0) {
  console.log('❌ Missing files:');
  missingFiles.forEach((file) => console.log(`   - ${file}`));
  console.log('\n💡 Run this script after setting up all demo files.');
  process.exit(1);
}

console.log('✅ All demo files found');
console.log('');

// Run tests
runTests().catch(console.error);
