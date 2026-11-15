import { createHmac, timingSafeEqual } from 'node:crypto';

// payOS documentation: https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/
export function payosSignatureData(data: Record<string, unknown>): string {
  return Object.keys(data)
    .sort()
    .filter((key) => data[key] !== undefined)
    .map((key) => {
      let value = data[key];
      if (Array.isArray(value)) {
        value = JSON.stringify(value.map((element: unknown) => {
          if (!element || typeof element !== 'object' || Array.isArray(element)) return element;
          return Object.keys(element).sort().reduce<Record<string, unknown>>((sorted, name) => {
            sorted[name] = (element as Record<string, unknown>)[name];
            return sorted;
          }, {});
        }));
      }
      if (value == null || value === 'null' || value === 'undefined') value = '';
      return `${key}=${String(value)}`;
    }).join('&');
}

export function payosHmac(data: Record<string, unknown>, checksumKey: string): string {
  return createHmac('sha256', checksumKey).update(payosSignatureData(data), 'utf8').digest('hex');
}

export function verifyPayosWebhook(raw: unknown, checksumKey: string): {
  success: boolean;
  code: string;
  data: Record<string, unknown>;
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid webhook');
  const webhook = raw as Record<string, unknown>;
  if (!webhook.data || typeof webhook.data !== 'object' || Array.isArray(webhook.data) ||
      typeof webhook.signature !== 'string' || !/^[a-f0-9]{64}$/i.test(webhook.signature)) {
    throw new Error('Invalid webhook shape');
  }
  const actual = Buffer.from(webhook.signature, 'hex');
  const expected = Buffer.from(payosHmac(webhook.data as Record<string, unknown>, checksumKey), 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error('Invalid webhook signature');
  }
  return {
    success: webhook.success === true,
    code: typeof webhook.code === 'string' ? webhook.code : '',
    data: webhook.data as Record<string, unknown>,
  };
}

// Outgoing payment link signature fields are EXACTLY amount,cancelUrl,description,orderCode,returnUrl.
export function payosCreateSignature(input: {
  amount: number; cancelUrl: string; description: string; orderCode: number; returnUrl: string;
}, key: string): string {
  return payosHmac(input, key);
}
