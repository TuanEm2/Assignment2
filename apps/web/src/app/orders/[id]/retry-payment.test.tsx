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
  expect(screen.getByRole('radio', { name: 'Thành công' })).toBeDisabled();
  expect(screen.getByRole('radio', { name: 'Thất bại' })).toBeDisabled();
});

it('thử lại sau PAYMENT_FAILED trên cùng đơn với khóa thanh toán mới', async () => {
  const user = userEvent.setup();
  const onPaid = vi.fn();
  const onFailed = vi.fn();
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(Response.json({ success: false, status: 'PAYMENT_FAILED' }))
    .mockResolvedValueOnce(Response.json({ success: true, status: 'PAID' }));
  vi.stubGlobal('fetch', fetchMock);
  render(<RetryPayment orderId="order-123" token="mock-token" onPaid={onPaid} onFailed={onFailed} />);

  await user.click(screen.getByRole('radio', { name: 'Thất bại' }));
  await user.click(screen.getByRole('button', { name: /thanh toán lại \(mô phỏng\)/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/thất bại/i);
  expect(onPaid).not.toHaveBeenCalled();
  expect(onFailed).toHaveBeenCalledOnce();
  await user.click(screen.getByRole('radio', { name: 'Thành công' }));
  await user.click(screen.getByRole('button', { name: /thanh toán lại \(mô phỏng\)/i }));
  await waitFor(() => expect(onPaid).toHaveBeenCalledOnce());

  const attempts = fetchMock.mock.calls.map(([, options]) => JSON.parse(String(options.body)));
  expect(attempts.map(attempt => attempt.orderId)).toEqual(['order-123', 'order-123']);
  expect(attempts.map(attempt => attempt.outcome)).toEqual(['FAILURE', 'SUCCESS']);
  expect(attempts[0].idempotencyKey).not.toBe(attempts[1].idempotencyKey);
});

it('ẩn lựa chọn kết quả mô phỏng khi dùng PayOS', () => {
  vi.stubEnv('NEXT_PUBLIC_PAYOS_ENABLED', 'true');
  render(<RetryPayment orderId="order-123" token="mock-token" onPaid={vi.fn()} />);
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Tiếp tục thanh toán PayOS' })).toBeInTheDocument();
});
