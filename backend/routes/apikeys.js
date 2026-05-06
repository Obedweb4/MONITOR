const router = require('express').Router();
const crypto = require('crypto');
const { getDB } = require('../lib/db');
const { requireAuth, hashApiKey } = require('../lib/auth');

router.use(requireAuth);

// List user's API keys
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const keys = await db.getUserApiKeys(req.userId);
    res.json(keys);
  } catch (err) {
    console.error('List API keys error:', err.message);
    res.status(500).json({ error: 'Failed to load API keys' });
  }
});

// Create a new API key
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    const name = (req.body.name || '').trim().slice(0, 100);
    if (!name) return res.status(400).json({ error: 'API key name is required' });

    const existingKeys = await db.getUserApiKeys(req.userId);
    if (existingKeys.length >= 10)
      return res.status(400).json({ error: 'Maximum of 10 API keys allowed per account' });

    const rawKey = 'gm_' + crypto.randomBytes(32).toString('hex');
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    await db.createApiKey(req.userId, name, keyHash, keyPrefix);

    res.json({ key: rawKey, prefix: keyPrefix, name, message: 'Copy this key — it will not be shown again.' });
  } catch (err) {
    console.error('Create API key error:', err.message);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// Delete (revoke) an API key
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    await db.deleteApiKey(req.params.id, req.userId);
    res.json({ message: 'API key deleted' });
  } catch (err) {
    console.error('Delete API key error:', err.message);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

module.exports = router;
