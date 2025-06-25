require('dotenv').config();

import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';

import * as middlewares from './middlewares';
import api from './api';
import MessageResponse from './interfaces/MessageResponse';

console.log('GOODPASS_API_URL: in app.ts', process.env.GOODPASS_API_URL);

const app = express();

app.use(morgan('dev'));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://js.stripe.com',
          'https://cdn.jsdelivr.net',
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        fontSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        connectSrc: [
          "'self'",
          'http://localhost:3054',
          'https://api.stripe.com',
          'https://partner-api.goodpass.club',
        ],
        frameSrc: ['https://js.stripe.com', 'https://hooks.stripe.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

app.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: 'Partner Payment Integration Sample',
  });
});

app.use('/api/v1', api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
