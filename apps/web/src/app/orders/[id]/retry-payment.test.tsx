import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { RetryPayment } from './retry-payment';

afterEach(() => vi.unstubAllGlobals());

it('thanh toán lại dùng đúng orderId, không tạo đơn mới và chỉ xác nhận khi backend success', async () => {
  const user = userEvent.setup();
  const onPaid = vi.fn();
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true, status: 'PAID' }));
  vi.stubGlobal('fetch', fetchMock);
  render(<RetryPayment orderId="order-123" token="mock-token" onPaid={onPaid} />);
  await user.click(screen.getByRole('button', { name: /thanh toán lại \(mô phỏng\)/i }));
  await waitFor(() => expect(onPaid).toHaveBeenCalledOnce());
  expect(fetchMock).toHaveBeenCalledOnce();
  const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toContain('/payments/mock');
  expect(options.method).toBe('POST');
  expect(JSON.parse(String(options.body))).toMatchObject({
    orderId: 'order-123', method: 'MOCK_WALLET', outcome: 'SUCCESS',
  });
});

it('trạng thái chưa rõ không được tự đánh dấu PAID', async () => {
  const user = userEvent.setup();
  const onPaid = vi.fn();
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 502 }));
  vi.stubGlobal('fetch', fetchMock);
  render(<RetryPayment orderId="order-123" token="mock-token" onPaid={onPaid} />);
  await user.click(screen.getByRole('button', { name: /thanh toán lại \(mô phỏng\)/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/kết quả thanh toán chưa rõ/i);
  expect(onPaid).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: /thanh toán lại \(mô phỏng\)/i })).toBeDisabled();
});
