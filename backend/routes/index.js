const router = require('express').Router();

router.use('/auth',     require('./auth'));
router.use('/monitors', require('./monitors'));
router.use('/admin',    require('./admin'));
router.use('/contact',  require('./contact'));
router.use('/apikeys',  require('./apikeys'));
router.use('/v1',       require('./v1'));

router.get('/status', (req, res) => {
  res.json({ service: 'OBEDTECH MONITOR', status: 'running', uptime: Math.floor(process.uptime()) });
});

router.use('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

module.exports = router;
