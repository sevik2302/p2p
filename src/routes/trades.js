const router = require('express').Router();
const ctrl = require('../controllers/tradeController');
const { authRequired, adminRequired } = require('../middleware/auth');

router.get('/', authRequired, ctrl.myTrades);
router.get('/:id', authRequired, ctrl.getTrade);
router.post('/', authRequired, ctrl.openTrade);
router.post('/:id/paid', authRequired, ctrl.markPaid);
router.post('/:id/release', authRequired, ctrl.releaseTrade);
router.post('/:id/dispute', authRequired, ctrl.disputeTrade);
router.post('/:id/cancel', authRequired, ctrl.cancelTrade);
router.post('/:id/message', authRequired, ctrl.sendMessage);
router.post('/:id/resolve', authRequired, adminRequired, ctrl.resolveDispute);

module.exports = router;
