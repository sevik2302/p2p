const router = require('express').Router();
const ctrl = require('../controllers/offerController');
const { authRequired } = require('../middleware/auth');

router.get('/', ctrl.listOffers);
router.get('/:id', ctrl.getOffer);
router.post('/', authRequired, ctrl.createOffer);
router.post('/:id/close', authRequired, ctrl.closeOffer);

module.exports = router;
