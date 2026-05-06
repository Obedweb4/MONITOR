const router = require('express').Router();
const { getDB } = require('../lib/db');
const { sanitize } = require('../lib/auth');

router.post('/', async (req, res) => {
  try {
    const { name, email, whatsapp, subject, message } = req.body;
    if (!name || !email || !subject || !message)
      return res.status(400).json({ error: 'Name, email, subject and message are required.' });
    if (name.trim().length < 2) return res.status(400).json({ error: 'Name is too short.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (subject.trim().length < 3) return res.status(400).json({ error: 'Subject is too short.' });
    if (message.trim().length < 10) return res.status(400).json({ error: 'Message is too short (min 10 chars).' });
    const db = getDB();
    await db.saveContactMessage({
      name:    sanitize(name.trim()).slice(0, 150),
      email:   email.trim().toLowerCase().slice(0, 150),
      whatsapp: (whatsapp || '').trim().slice(0, 30),
      subject: sanitize(subject.trim()).slice(0, 255),
      message: sanitize(message.trim()).slice(0, 5000),
    });
    res.json({ ok: true, message: 'Your message has been received. We will get back to you soon!' });
  } catch (err) {
    console.error('Contact route error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
});

module.exports = router;
