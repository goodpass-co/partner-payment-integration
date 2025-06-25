# Partner Payment Integration - Production Deployment Guide

## 🎯 Overview

This guide outlines the steps to deploy the Partner payment integration to production, ensuring secure and reliable payment processing with Goodpass APIs.

## 🚀 Pre-Deployment Checklist

### 1. Production Credentials

- [ ] Obtain production API key from Goodpass partner management
- [ ] Verify production API endpoint URL
- [ ] Test connectivity to production environment
- [ ] Validate rate limits and quotas

### 2. Environment Setup

- [ ] Production server provisioned
- [ ] SSL/TLS certificates installed
- [ ] Domain name configured
- [ ] Load balancer configured (if needed)
- [ ] CDN setup (if needed)

### 3. Security Hardening

- [ ] Firewall rules configured
- [ ] API rate limiting enabled
- [ ] Request/response logging configured
- [ ] Error reporting setup
- [ ] Security headers implemented

## 🔧 Environment Configuration

### Production Environment Variables

```bash
# Production Configuration
NODE_ENV=production
PORT=3000

# Goodpass API Configuration
GOODPASS_API_URL=https://partner-api.goodpass.co/partner/v1
PARTNER_API_KEY=gp_prod_YOUR_PRODUCTION_API_KEY_HERE

# Security Configuration
JWT_SECRET=your_secure_jwt_secret_here
API_RATE_LIMIT=100  # requests per minute
API_TIMEOUT=30000   # 30 seconds

# Monitoring
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
ENABLE_ERROR_REPORTING=true

# Webhook Configuration (if using webhooks)
WEBHOOK_SECRET=your_webhook_secret_here
WEBHOOK_URL=https://your-domain.com/webhooks/payment
```

### SSL/TLS Configuration

```bash
# SSL Certificate paths
SSL_CERT_PATH=/etc/ssl/certs/partner-payment.crt
SSL_KEY_PATH=/etc/ssl/private/partner-payment.key
SSL_CA_PATH=/etc/ssl/certs/ca-bundle.crt

# Force HTTPS
FORCE_HTTPS=true
```

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S partner -u 1001

# Change ownership to non-root user
RUN chown -R partner:nodejs /app
USER partner

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Start application
CMD ["npm", "start"]
```

### Docker Compose (Production)

```yaml
version: '3.8'

services:
  partner-payment-api:
    build: .
    restart: always
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - GOODPASS_API_URL=https://partner-api.goodpass.co/partner/v1
      - PARTNER_API_KEY=${PARTNER_API_KEY}
      - LOG_LEVEL=info
    volumes:
      - ./logs:/app/logs
      - /etc/ssl/certs:/etc/ssl/certs:ro
    networks:
      - partner-network
    depends_on:
      - redis
      - monitoring

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
    depends_on:
      - partner-payment-api
    networks:
      - partner-network

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis-data:/data
    networks:
      - partner-network

  monitoring:
    image: prom/prometheus:latest
    restart: always
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    networks:
      - partner-network

volumes:
  redis-data:

networks:
  partner-network:
    driver: bridge
```

## 🌐 Nginx Configuration

### nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    upstream partner_payment_api {
        server partner-payment-api:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL Configuration
        ssl_certificate /etc/ssl/certs/partner-payment.crt;
        ssl_certificate_key /etc/ssl/private/partner-payment.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Security Headers
        add_header Strict-Transport-Security "max-age=63072000" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;

        # API Routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;

            proxy_pass http://partner_payment_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Health Check
        location /health {
            proxy_pass http://partner_payment_api/api/v1/health;
            access_log off;
        }
    }
}
```

## 📊 Monitoring & Logging

### Application Monitoring

```javascript
// src/monitoring/metrics.js
const prometheus = require('prom-client');

// Create metrics
const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
});

const paymentRequestsTotal = new prometheus.Counter({
  name: 'payment_requests_total',
  help: 'Total number of payment requests',
  labelNames: ['type', 'status'],
});

module.exports = {
  httpRequestsTotal,
  httpRequestDuration,
  paymentRequestsTotal,
  register: prometheus.register,
};
```

### Structured Logging

```javascript
// src/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'partner-payment-api',
    partner: 'PARTNER',
  },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

module.exports = logger;
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: Deploy Partner Payment API

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit --audit-level moderate

  deploy:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
          PARTNER_API_KEY: ${{ secrets.PARTNER_API_KEY }}
        run: |
          echo "$DEPLOY_KEY" > deploy_key
          chmod 600 deploy_key
          ssh -i deploy_key -o StrictHostKeyChecking=no $DEPLOY_USER@$DEPLOY_HOST '
            cd /opt/partner-payment-api &&
            git pull origin main &&
            docker-compose down &&
            docker-compose build &&
            docker-compose up -d
          '
```

## 🧪 Production Testing

### Health Check Endpoints

```bash
# API availability
curl -f https://your-domain.com/api/v1/demo/scenarios

# Test direct payment endpoint
curl -X POST https://your-domain.com/api/v1/payments/direct/process \
  -H "Content-Type: application/json" \
  -d '{"orderCode": "TEST", "paymentMethod": {"type": "card", "token": "pm_card_visa"}}'

# Test hosted payment endpoint
curl -X POST https://your-domain.com/api/v1/payments/hosted/create-session \
  -H "Content-Type: application/json" \
  -d '{"orderCode": "TEST", "successUrl": "https://test.com/success", "cancelUrl": "https://test.com/cancel"}'
```

### Load Testing

```bash
# Install artillery
npm install -g artillery

# Run load test
artillery run load-test.yml
```

### load-test.yml

```yaml
config:
  target: 'https://your-domain.com'
  phases:
    - duration: 60
      arrivalRate: 10
  variables:
    orderCode: 'LOAD_TEST_{{ $randomString() }}'

scenarios:
  - name: 'Payment API Load Test'
    flow:
      - get:
          url: '/api/v1/demo/scenarios'
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
```

## 🚨 Alerting Configuration

### Prometheus Alerts

```yaml
# alerts.yml
groups:
  - name: partner-payment-api
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value }} errors per second'

      - alert: PaymentAPIDown
        expr: up{job="partner-payment-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Payment API is down'
          description: 'Partner Payment API has been down for more than 1 minute'

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High response time'
          description: '95th percentile response time is {{ $value }}s'
```

## 🔒 Security Checklist

### Pre-Production Security Review

- [ ] API authentication implemented and tested
- [ ] Rate limiting configured
- [ ] Input validation in place
- [ ] SQL injection protection (if applicable)
- [ ] XSS protection headers set
- [ ] CORS configuration reviewed
- [ ] Sensitive data encryption verified
- [ ] Error messages don't leak sensitive information
- [ ] Dependency vulnerabilities scanned
- [ ] Security headers implemented

### Regular Security Maintenance

- [ ] Weekly dependency updates
- [ ] Monthly security scans
- [ ] Quarterly penetration testing
- [ ] Annual security audit
- [ ] API key rotation schedule
- [ ] SSL certificate renewal schedule

## 📋 Go-Live Checklist

### Pre-Launch (T-1 Week)

- [ ] All tests passing in staging
- [ ] Performance testing completed
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures tested
- [ ] Rollback plan documented

### Launch Day (T-0)

- [ ] Deploy to production
- [ ] Verify all health checks pass
- [ ] Run smoke tests
- [ ] Monitor key metrics
- [ ] Test payment flows end-to-end
- [ ] Verify webhook functionality (if applicable)
- [ ] Confirm error alerting works

### Post-Launch (T+1 Day)

- [ ] Review application logs
- [ ] Check payment success rates
- [ ] Monitor response times
- [ ] Verify no critical alerts
- [ ] Review customer feedback
- [ ] Document any issues

### Post-Launch (T+1 Week)

- [ ] Performance review meeting
- [ ] Update documentation with lessons learned
- [ ] Plan next iteration improvements
- [ ] Schedule regular maintenance windows

## 📞 Support & Escalation

### Internal Support Contacts

- **DevOps Team**: devops@partner.com
- **Security Team**: security@partner.com
- **Platform Team**: platform@partner.com

### External Support Contacts

- **Goodpass Technical Support**: support@goodpass.co
- **Goodpass Partner Management**: partners@goodpass.co
- **Emergency Escalation**: +60-xxx-xxx-xxxx

### Support Procedures

1. **Level 1**: Application monitoring alerts → On-call engineer
2. **Level 2**: System-wide issues → Platform team lead
3. **Level 3**: Payment gateway issues → Contact Goodpass support
4. **Level 4**: Security incidents → Security team + Management

## 📈 Success Metrics

### Key Performance Indicators

- **Payment Success Rate**: Target >99%
- **API Response Time**: Target <500ms p95
- **System Uptime**: Target >99.9%
- **Error Rate**: Target <0.1%

### Business Metrics

- **Payment Volume**: Daily/Monthly tracking
- **Revenue Processing**: Real-time monitoring
- **Customer Satisfaction**: Payment experience surveys
- **Conversion Rate**: Payment completion rates

The deployment is now ready for production with comprehensive monitoring, security, and operational procedures in place.
