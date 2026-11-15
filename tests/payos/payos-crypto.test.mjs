import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { payosSignatureData, payosCreateSignature, verifyPayosWebhook } from '../../apps/api/src/payos/payos-crypto.ts';

test('payment create signature uses five alphabetically sorted fields', () => {
  const data = { amount: 50000, cancelUrl: 'https://web.example/cancel', description: 'BL12345', orderCode: 12345, returnUrl: 'https://web.example/return' };
  const canonical = 'amount=50000&cancelUrl=https://web.example/cancel&description=BL12345&orderCode=12345&returnUrl=https://web.example/return';
  assert.equal(payosSignatureData(data), canonical);
  assert.equal(payosCreateSignature(data, 'test-secret'), createHmac('sha256','test-secret').update(canonical).digest('hex'));
});

test('webhook verified with constant-time comparison; invalid signatures rejected', () => {
  const data = { orderCode: 12345, amount: 50000, code: '00', reference: 'bank-ref', currency: 'VND', paymentLinkId: 'link-id' };
  const signature = createHmac('sha256', 'test-secret').update(payosSignatureData(data)).digest('hex');
  const raw = { code: '00', success: true, data, signature };
  assert.equal(verifyPayosWebhook(raw, 'test-secret').data.orderCode, 12345);
  assert.throws(() => verifyPayosWebhook({ ...raw, data: { ...data, amount: 1 } }, 'test-secret'), /signature/);
  assert.throws(() => verifyPayosWebhook({ ...raw, signature: '0'.repeat(64) }, 'test-secret'), /signature/);
});
