const { app, request, registerUser } = require('./setup');
const {
  buildMerchantTradeNo,
  generateCheckMacValue,
  getEcpayEnv
} = require('../src/utils/ecpay');

describe('ECPay API', () => {
  let userToken;
  let orderId;
  let orderNo;
  let merchantTradeNo;
  let totalAmount;

  beforeAll(async () => {
    const { token } = await registerUser();
    userToken = token;

    const productRes = await request(app).get('/api/products');
    const product = productRes.body.data.products[0];

    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: product.id, quantity: 1 });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        recipientName: '金流測試收件人',
        recipientEmail: 'ecpay@example.com',
        recipientAddress: '台北市金流測試路 100 號'
      });

    orderId = orderRes.body.data.id;
    orderNo = orderRes.body.data.order_no;
    merchantTradeNo = buildMerchantTradeNo({ order_no: orderNo });
    totalAmount = orderRes.body.data.total_amount;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create ECPay checkout params', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/ecpay/checkout`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data.checkoutUrl');
    expect(res.body.data.checkoutUrl).toContain('ecpay.com.tw');
    expect(res.body.data.params).toHaveProperty('MerchantTradeNo', merchantTradeNo);
    expect(res.body.data.params).toHaveProperty('TotalAmount', totalAmount);
    expect(res.body.data.params).toHaveProperty('OrderResultURL');
    expect(res.body.data.params).toHaveProperty('CheckMacValue');

    const env = getEcpayEnv();
    const { CheckMacValue, ...params } = res.body.data.params;
    const expected = generateCheckMacValue(params, env.hashKey, env.hashIv);
    expect(CheckMacValue).toBe(expected);
  });

  it('should redirect browser result back to local order page', async () => {
    const resultData = {
      TransCode: 1,
      Data: {
        MerchantTradeNo: merchantTradeNo
      }
    };

    const res = await request(app)
      .post(`/api/ecpay/orders/${orderId}/result`)
      .type('form')
      .send({ ResultData: JSON.stringify(resultData) });

    expect(res.status).toBe(303);
    expect(res.headers.location).toBe(`/orders/${orderId}?payment=verify`);
  });

  it('should verify paid order by querying ECPay', async () => {
    const env = getEcpayEnv();
    const responsePayload = {
      MerchantID: env.merchantId,
      MerchantTradeNo: merchantTradeNo,
      TradeNo: '2404181234567890',
      TradeAmt: String(totalAmount),
      TradeStatus: '1',
      PaymentDate: '2026/04/18 10:30:00',
      PaymentType: 'Credit_CreditCard'
    };
    responsePayload.CheckMacValue = generateCheckMacValue(responsePayload, env.hashKey, env.hashIv);
    const responseText = new URLSearchParams(responsePayload).toString();

    vi.spyOn(global, 'fetch').mockResolvedValue({
      text: async () => responseText
    });

    const res = await request(app)
      .post(`/api/orders/${orderId}/ecpay/verify`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data.order.status', 'paid');
    expect(res.body).toHaveProperty('data.verified', true);
    expect(res.body).toHaveProperty('data.ecpay.TradeNo', '2404181234567890');
    expect(res.body).toHaveProperty('data.items');
  });
});
