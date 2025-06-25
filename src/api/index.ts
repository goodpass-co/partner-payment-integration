import express from 'express';

import payments from './payments';
import demo from './demo';

const router = express.Router();

router.use('/payments', payments);
router.use('/demo', demo);

export default router;
