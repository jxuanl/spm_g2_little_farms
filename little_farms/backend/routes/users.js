import express from 'express'
import { getUserByEmail } from '../services/userService.js'
const router = express.Router()

router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });
    const user = await getUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error in login route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default router