const express = require('express');
const db = require('../database');
const {
  parseOrderResultData,
  buildMerchantTradeNo,
  verifyOrderPayment
} = require('../utils/ecpay');

const router = express.Router();

/**
 * @openapi
 * /api/ecpay/orders/{id}/notify:
 *   post:
 *     summary: 綠界 AIO 伺服器通知
 *     tags: [ECPay]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 固定回傳 1|OK
 */
router.post('/orders/:id/notify', async (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (order && order.status !== 'paid') {
      await verifyOrderPayment({ db, orderId: order.id });
    }
  } catch (error) {
    console.error('ECPay notify handler error:', error.message);
  }

  res.type('text/plain').send('1|OK');
});

/**
 * @openapi
 * /api/ecpay/orders/{id}/result:
 *   post:
 *     summary: 綠界 AIO 瀏覽器回跳
 *     tags: [ECPay]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       303:
 *         description: 導回本機訂單詳情頁
 */
router.post('/orders/:id/result', (req, res) => {
  const resultData = parseOrderResultData(req.body?.ResultData);
  const orderId = req.params.id;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const merchantTradeNo = resultData?.Data?.MerchantTradeNo
    || resultData?.MerchantTradeNo
    || (order ? buildMerchantTradeNo(order) : null)
    || orderId;

  const expectedTradeNo = order ? buildMerchantTradeNo(order) : null;

  if (order && merchantTradeNo !== expectedTradeNo) {
    console.warn('ECPay result callback trade no mismatch:', {
      orderId,
      orderNo: order.order_no,
      merchantTradeNo,
      expectedTradeNo
    });
  }

  res.redirect(303, `/orders/${orderId}?payment=verify`);
});

module.exports = router;
