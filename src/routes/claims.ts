import { Hono } from 'hono';

const router = new Hono();

router.all('*', (c) => c.json({ error: 'Not implemented' }, 501));

export default router;
