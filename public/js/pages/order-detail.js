const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const el = document.getElementById('app');
    const orderId = el.dataset.orderId;
    const paymentResult = ref(el.dataset.paymentResult || null);

    const order = ref(null);
    const loading = ref(true);
    const paying = ref(false);
    const verifying = ref(false);

    const statusMap = {
      pending: { label: '待付款', cls: 'bg-apricot/20 text-apricot' },
      paid: { label: '已付款', cls: 'bg-sage/20 text-sage' },
      failed: { label: '付款失敗', cls: 'bg-red-100 text-red-600' },
    };

    const paymentMessages = {
      verify: { text: '已返回付款結果頁面，正在確認綠界交易狀態。', cls: 'bg-blue-50 text-blue-700 border border-blue-100' },
      success: { text: '付款成功！感謝您的購買。', cls: 'bg-sage/10 text-sage border border-sage/20' },
      pending: { text: '目前尚未查到付款成功紀錄，請稍後再查詢。', cls: 'bg-apricot/10 text-apricot border border-apricot/20' },
      failed: { text: '付款失敗，請重試。', cls: 'bg-red-50 text-red-600 border border-red-100' },
      cancel: { text: '付款已取消。', cls: 'bg-apricot/10 text-apricot border border-apricot/20' },
    };

    function submitCheckoutForm(action, fields) {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = action;
      form.style.display = 'none';

      Object.entries(fields).forEach(function ([key, value]) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    }

    async function startEcpayCheckout() {
      if (!order.value || paying.value || order.value.status !== 'pending') return;
      paying.value = true;
      try {
        const res = await apiFetch('/api/orders/' + order.value.id + '/ecpay/checkout', {
          method: 'POST'
        });
        submitCheckoutForm(res.data.checkoutUrl, res.data.params);
      } catch (e) {
        Notification.show(e?.data?.message || '建立綠界付款失敗', 'error');
      } finally {
        paying.value = false;
      }
    }

    async function verifyPayment() {
      if (!order.value || verifying.value) return;
      verifying.value = true;
      try {
        const res = await apiFetch('/api/orders/' + order.value.id + '/ecpay/verify', {
          method: 'POST'
        });
        order.value = {
          ...res.data.order,
          items: res.data.items || order.value.items
        };

        if (res.data.order.status === 'paid' || res.data.verified) {
          paymentResult.value = 'success';
          history.replaceState({}, '', '/orders/' + order.value.id + '?payment=success');
          Notification.show('付款已驗證成功', 'success');
        } else {
          paymentResult.value = 'pending';
          history.replaceState({}, '', '/orders/' + order.value.id + '?payment=pending');
          Notification.show(res.message || '目前尚未查到付款成功紀錄', 'info');
        }
      } catch (e) {
        Notification.show(e?.data?.message || '付款查詢失敗', 'error');
      } finally {
        verifying.value = false;
      }
    }

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/orders/' + orderId);
        order.value = res.data;
        if (paymentResult.value === 'verify') {
          await verifyPayment();
        }
      } catch (e) {
        Notification.show('載入訂單失敗', 'error');
      } finally {
        loading.value = false;
      }
    });

    return {
      order,
      loading,
      paying,
      verifying,
      paymentResult,
      statusMap,
      paymentMessages,
      startEcpayCheckout,
      verifyPayment
    };
  }
}).mount('#app');
