// src/routes/apiRoutes.ts
import { Router, Request, Response } from 'express';
import axios from 'axios';

import { SR_CLIENT_URL } from '../lib/env.js'

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  res.status(200).json({ message: 'Client OK' });
});


router.get('/healthcheck', async (req: Request, res: Response) => {
  try {
    console.log(`GET ${SR_CLIENT_URL}/healthcheck`)
    const response = await axios.get(SR_CLIENT_URL + '/healthcheck');
    const data = response.data;
    res.status(200).json(data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error fetching data:', error.message);
      res.status(error.response?.status || 500).json({ message: 'Failed to fetch external data' });
    } else {
      // Handle other potential errors
      console.error('An unexpected error occurred:', error);
      res.status(500).json({ message: 'An unexpected error occurred' });
    }
  }
});

export default router;