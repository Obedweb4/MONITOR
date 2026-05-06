/**
 * Public REST API v1 — authenticated via X-API-Key header
 * Scope: Monitor operations only (no account/auth operations)
 */
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { getDB } = require('../lib/db');
const { requireApiKey, sanitize } = require('../lib/auth');
const { pingMonitor } = require('../lib/ping');
const config = require('../config');

// v1 API rate limiter: 60 requests per minute per IP+key combination
const v1Limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'API rate limit exceeded. Max 60 requests per minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(v1Limiter);
router.use(requireApiKey);

// GET /api/v1/monitors — list all monitors for the key owner
router.get('/monitors', async (req, res) => {
  try {
    const db = getDB();
    const monitors = await db.getUserMonitors(req.userId);
    const result = await Promise.all(monitors.map(async m => ({
      ...m,
      history: await db.getMonitorHistory(m.id, 30)
    })));
    res.json({ monitors: result, count: result.length });
  } catch (err) {
    console.error('v1 list monitors:', err.message);
    res.status(500).json({ error: 'Failed to load monitors' });
  }
});

// GET /api/v1/monitors/:id — get a single monitor with full history
router.get('/monitors/:id', async (req, res) => {
  try {
    const db = getDB();
    const monitor = await db.getMonitor(req.params.id);
    if (!monitor) return res.status(404).json({ error: 'Monitor not found' });
    if (String(monitor.user_id) !== String(req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const history = await db.getMonitorHistory(monitor.id, 60);
    res.json({ ...monitor, history });
  } catch (err) {
    console.error('v1 get monitor:', err.message);
    res.status(500).json({ error: 'Failed to load monitor' });
  }
});

// POST /api/v1/monitors — create a monitor
router.post('/monitors', async (req, res) => {
  try {
    const db = getDB();
    const user = await db.getUserById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const name = sanitize(req.body.name);
    const url  = sanitize(req.body.url);
    const path = req.body.path ? sanitize(req.body.path) : null;
    const method = (sanitize(req.body.method) || 'GET').toUpperCase();
    const body = (method === 'POST' && req.body.body) ? sanitize(req.body.body) : null;
    let intervalMins = parseFloat(req.body.intervalMins || req.body.interval_mins) || 3;

    if (!name || !url) return res.status(400).json({ error: 'name and url are required' });
    if (name.length > 100) return res.status(400).json({ error: 'Monitor name too long (max 100 chars)' });
    if (!url.startsWith('http')) return res.status(400).json({ error: 'URL must start with http:// or https://' });
    if (!['GET', 'HEAD', 'POST'].includes(method)) return res.status(400).json({ error: 'method must be GET, HEAD, or POST' });
    if (intervalMins < config.MIN_PING_INTERVAL_MINS) return res.status(400).json({ error: 'Minimum interval is 30 seconds (0.5)' });
    if (intervalMins > 1440) return res.status(400).json({ error: 'Maximum interval is 24 hours (1440)' });

    const notifyDown = req.body.notify_down !== false && req.body.notify_down !== 'false';
    const notifyUp   = req.body.notify_up   !== false && req.body.notify_up   !== 'false';

    const currentCount = await db.getUserMonitorCount(req.userId);
    const limit = user.monitor_limit ?? 20;
    if (currentCount >= limit)
      return res.status(403).json({ error: `Monitor limit reached (${limit}). Upgrade your account for more monitors.` });

    const monitor = await db.createMonitor(req.userId, { name, url, path, method, body, intervalMins, notifyDown, notifyUp });
    res.status(201).json(monitor);
  } catch (err) {
    console.error('v1 create monitor:', err.message);
    res.status(500).json({ error: 'Failed to create monitor' });
  }
});

// PUT /api/v1/monitors/:id — update a monitor
router.put('/monitors/:id', async (req, res) => {
  try {
    const db = getDB();
    const monitor = await db.getMonitor(req.params.id);
    if (!monitor) return res.status(404).json({ error: 'Monitor not found' });
    if (String(monitor.user_id) !== String(req.userId)) return res.status(403).json({ error: 'Forbidden' });

    const { name, url, path, method, body, intervalMins, interval_mins, is_active, notify_down, notify_up } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = sanitize(name);
    if (url !== undefined) updates.url = sanitize(url);
    if (path !== undefined) updates.path = path ? sanitize(path) : null;
    if (method !== undefined) {
      updates.method = sanitize(method).toUpperCase();
      if (updates.method !== 'POST') updates.body = null;
    }
    if (body !== undefined && (updates.method || monitor.method) === 'POST') updates.body = sanitize(body) || null;
    const mins = intervalMins || interval_mins;
    if (mins !== undefined) {
      const i = parseFloat(mins);
      if (i < config.MIN_PING_INTERVAL_MINS) return res.status(400).json({ error: 'Minimum interval is 30 seconds (0.5)' });
      if (i > 1440) return res.status(400).json({ error: 'Maximum interval is 24 hours (1440)' });
      updates.interval_mins = i;
    }
    if (is_active !== undefined) updates.is_active = is_active;
    if (notify_down !== undefined) updates.notify_down = notify_down !== false && notify_down !== 'false';
    if (notify_up   !== undefined) updates.notify_up   = notify_up   !== false && notify_up   !== 'false';

    const updated = await db.updateMonitor(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    console.error('v1 update monitor:', err.message);
    res.status(500).json({ error: 'Failed to update monitor' });
  }
});

// DELETE /api/v1/monitors/:id — delete a monitor (no password required for API key auth)
router.delete('/monitors/:id', async (req, res) => {
  try {
    const db = getDB();
    const monitor = await db.getMonitor(req.params.id);
    if (!monitor) return res.status(404).json({ error: 'Monitor not found' });
    if (String(monitor.user_id) !== String(req.userId)) return res.status(403).json({ error: 'Forbidden' });
    await db.deleteMonitor(req.params.id);
    res.json({ message: 'Monitor deleted' });
  } catch (err) {
    console.error('v1 delete monitor:', err.message);
    res.status(500).json({ error: 'Failed to delete monitor' });
  }
});

// POST /api/v1/monitors/:id/ping — trigger a manual ping
router.post('/monitors/:id/ping', async (req, res) => {
  try {
    const db = getDB();
    const monitor = await db.getMonitor(req.params.id);
    if (!monitor) return res.status(404).json({ error: 'Monitor not found' });
    if (String(monitor.user_id) !== String(req.userId)) return res.status(403).json({ error: 'Forbidden' });
    pingMonitor(monitor);
    res.json({ message: 'Ping triggered', monitor_id: req.params.id });
  } catch (err) {
    console.error('v1 trigger ping:', err.message);
    res.status(500).json({ error: 'Failed to trigger ping' });
  }
});

// PATCH /api/v1/monitors/:id/notifications — update notification preferences
router.patch('/monitors/:id/notifications', async (req, res) => {
  try {
    const db = getDB();
    const monitor = await db.getMonitor(req.params.id);
    if (!monitor) return res.status(404).json({ error: 'Monitor not found' });
    if (String(monitor.user_id) !== String(req.userId)) return res.status(403).json({ error: 'Forbidden' });

    const { notify_down, notify_up } = req.body;
    if (notify_down === undefined && notify_up === undefined)
      return res.status(400).json({ error: 'Provide at least one of: notify_down, notify_up' });

    const updates = {};
    if (notify_down !== undefined) updates.notify_down = notify_down !== false && notify_down !== 'false';
    if (notify_up   !== undefined) updates.notify_up   = notify_up   !== false && notify_up   !== 'false';

    const updated = await db.updateMonitor(req.params.id, updates);
    res.json({ id: updated.id, notify_down: updated.notify_down, notify_up: updated.notify_up });
  } catch (err) {
    console.error('v1 update notifications:', err.message);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// GET /api/v1/monitors/:id/history — get check history
router.get('/monitors/:id/history', async (req, res) => {
  try {
    const db = getDB();
    const monitor = await db.getMonitor(req.params.id);
    if (!monitor) return res.status(404).json({ error: 'Monitor not found' });
    if (String(monitor.user_id) !== String(req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const limit = Math.min(parseInt(req.query.limit) || 60, 200);
    const history = await db.getMonitorHistory(monitor.id, limit);
    res.json({ monitor_id: req.params.id, count: history.length, history });
  } catch (err) {
    console.error('v1 get history:', err.message);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

module.exports = router;
