const crypto = require('crypto');

function getEcpayEnv() {
  const merchantId = process.env.ECPAY_MERCHANT_ID || '3002607';
  const hashKey = process.env.ECPAY_HASH_KEY || 'pwFHCqoQZGmho4w6';
  const hashIv = process.env.ECPAY_HASH_IV || 'EkRm7iFT261dpevs';
  const mode = (process.env.ECPAY_ENV || 'staging').toLowerCase();
  const isProduction = mode === 'production' || mode === 'prod';

  return {
    merchantId,
    hashKey,
    hashIv,
    mode,
    isProduction,
    checkoutUrl: isProduction
      ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
      : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5',
    queryTradeUrl: isProduction
      ? 'https://payment.ecpay.com.tw/Cashier/QueryTradeInfo/V5'
      : 'https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5'
  };
}

function ecpayUrlEncode(source) {
  let encoded = encodeURIComponent(source)
    .replace(/%20/g, '+')
    .replace(/~/g, '%7e')
    .replace(/'/g, '%27');

  encoded = encoded.toLowerCase();
  return encoded
    .replace(/%2d/g, '-')
    .replace(/%5f/g, '_')
    .replace(/%2e/g, '.')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')');
}

function generateCheckMacValue(params, hashKey, hashIv, method = 'sha256') {
  const filtered = Object.entries(params)
    .filter(([key, value]) => key !== 'CheckMacValue' && value !== undefined && value !== null)
    .sort(([left], [right]) => {
      const a = left.toLowerCase();
      const b = right.toLowerCase();
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });

  const queryString = filtered.map(([key, value]) => `${key}=${value}`).join('&');
  const raw = `HashKey=${hashKey}&${queryString}&HashIV=${hashIv}`;
  const encoded = ecpayUrlEncode(raw);

  const digest = crypto
    .createHash(method === 'md5' ? 'md5' : 'sha256')
    .update(encoded)
    .digest('hex')
    .toUpperCase();

  return digest;
}

function verifyCheckMacValue(params, hashKey, hashIv, method = 'sha256') {
  const received = String(params.CheckMacValue || '').toUpperCase();
  const calculated = generateCheckMacValue(params, hashKey, hashIv, method);

  if (received.length !== calculated.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(calculated));
}

function formatTaipeiDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}/${values.month}/${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

function buildMerchantTradeDesc(order) {
  return `花漾生活訂單 ${order.order_no}`;
}

function buildMerchantTradeNo(order) {
  return String(order.order_no || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 20);
}

function buildItemName(items) {
  return items
    .map(item => `${item.product_name} x ${item.quantity}`)
    .join('#');
}

function buildCheckoutParams({ order, items, baseUrl }) {
  const env = getEcpayEnv();
  const origin = baseUrl || process.env.BASE_URL || 'http://localhost:3001';
  const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;

  const returnUrl = `${normalizedOrigin}/api/ecpay/orders/${order.id}/notify`;
  const orderResultUrl = `${normalizedOrigin}/api/ecpay/orders/${order.id}/result`;
  const clientBackUrl = `${normalizedOrigin}/orders/${order.id}?payment=cancel`;

  const params = {
    MerchantID: env.merchantId,
    MerchantTradeNo: buildMerchantTradeNo(order),
    MerchantTradeDate: formatTaipeiDate(),
    PaymentType: 'aio',
    TotalAmount: order.total_amount,
    TradeDesc: buildMerchantTradeDesc(order),
    ItemName: buildItemName(items),
    ReturnURL: returnUrl,
    ClientBackURL: clientBackUrl,
    OrderResultURL: orderResultUrl,
    ChoosePayment: 'Credit',
    EncryptType: 1,
    CustomField1: order.id
  };

  params.CheckMacValue = generateCheckMacValue(params, env.hashKey, env.hashIv, 'sha256');

  return {
    checkoutUrl: env.checkoutUrl,
    params,
    orderResultUrl,
    clientBackUrl,
    returnUrl
  };
}

function buildQueryTradeParams({ merchantTradeNo }) {
  const env = getEcpayEnv();
  const params = {
    MerchantID: env.merchantId,
    MerchantTradeNo: merchantTradeNo,
    TimeStamp: Math.floor(Date.now() / 1000)
  };

  params.CheckMacValue = generateCheckMacValue(params, env.hashKey, env.hashIv, 'sha256');

  return {
    queryTradeUrl: env.queryTradeUrl,
    params
  };
}

function parseQueryStringResponse(text) {
  const body = String(text || '').trim();
  if (!body) {
    throw new Error('ECPAY_QUERY_EMPTY_RESPONSE');
  }

  const parsed = {};
  const searchParams = new URLSearchParams(body);
  for (const [key, value] of searchParams.entries()) {
    parsed[key] = value;
  }
  return parsed;
}

async function queryTradeInfo(merchantTradeNo) {
  const env = getEcpayEnv();
  const { queryTradeUrl, params } = buildQueryTradeParams({ merchantTradeNo });

  const response = await fetch(queryTradeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(params).toString()
  });

  const text = await response.text();
  const parsed = parseQueryStringResponse(text);

  if (!verifyCheckMacValue(parsed, env.hashKey, env.hashIv, 'sha256')) {
    const err = new Error('ECPAY_QUERY_CHECKMAC_INVALID');
    err.status = 502;
    throw err;
  }

  return {
    raw: text,
    data: parsed
  };
}

function parseOrderResultData(resultData) {
  if (!resultData) return null;

  try {
    return JSON.parse(resultData);
  } catch (error) {
    return null;
  }
}

function createPaymentEnvelope(order, items, baseUrl) {
  return buildCheckoutParams({ order, items, baseUrl });
}

function buildPaymentStatusPayload({ order, query }) {
  return {
    order: {
      ...order
    },
    ecpay: {
      merchantTradeNo: query.MerchantTradeNo || null,
      tradeNo: query.TradeNo || null,
      tradeAmt: query.TradeAmt ? Number(query.TradeAmt) : null,
      tradeStatus: query.TradeStatus || null,
      paymentDate: query.PaymentDate || null,
      paymentType: query.PaymentType || null
    }
  };
}

async function verifyOrderPayment({ db, orderId }) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) {
    const err = new Error('ORDER_NOT_FOUND');
    err.status = 404;
    throw err;
  }

  if (order.status === 'paid') {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    return {
      order,
      items,
      query: null,
      verified: true,
      message: '訂單已完成付款'
    };
  }

  const merchantTradeNo = buildMerchantTradeNo(order);
  const query = await queryTradeInfo(merchantTradeNo);

  if (String(query.data.MerchantTradeNo || '') !== merchantTradeNo) {
    const err = new Error('ECPAY_QUERY_TRADE_NO_MISMATCH');
    err.status = 400;
    throw err;
  }

  const tradeAmt = Number(query.data.TradeAmt);
  if (!Number.isNaN(tradeAmt) && tradeAmt !== order.total_amount) {
    const err = new Error('ECPAY_QUERY_AMOUNT_MISMATCH');
    err.status = 400;
    throw err;
  }

  if (String(query.data.TradeStatus || '') === '1' && order.status !== 'paid') {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('paid', order.id);
  }

  const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

  return {
    order: updatedOrder,
    items,
    query: query.data,
    verified: String(query.data.TradeStatus || '') === '1',
    message: String(query.data.TradeStatus || '') === '1'
      ? '付款已驗證成功'
      : '目前尚未查到付款成功紀錄'
  };
}

module.exports = {
  getEcpayEnv,
  ecpayUrlEncode,
  generateCheckMacValue,
  verifyCheckMacValue,
  formatTaipeiDate,
  buildCheckoutParams,
  buildMerchantTradeNo,
  buildQueryTradeParams,
  parseQueryStringResponse,
  parseOrderResultData,
  createPaymentEnvelope,
  buildPaymentStatusPayload,
  queryTradeInfo,
  verifyOrderPayment
};
