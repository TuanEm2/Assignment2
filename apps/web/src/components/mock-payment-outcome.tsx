'use client';

import { useId } from 'react';

export type PaymentOutcome = 'SUCCESS' | 'FAILURE';

export function MockPaymentOutcomeSelector({ value, onChange, disabled = false }: {
  value: PaymentOutcome;
  onChange: (value: PaymentOutcome) => void;
  disabled?: boolean;
}) {
  const name = useId();

  return (
    <fieldset disabled={disabled} className="mt-3 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
      <legend className="font-semibold">Kết quả thanh toán mô phỏng</legend>
      <label className="mr-5 inline-flex items-center gap-2">
        <input type="radio" name={name} checked={value === 'SUCCESS'} onChange={() => onChange('SUCCESS')} />
        Thành công
      </label>
      <label className="inline-flex items-center gap-2">
        <input type="radio" name={name} checked={value === 'FAILURE'} onChange={() => onChange('FAILURE')} />
        Thất bại
      </label>
      <p className="text-sm text-stone-700">Chế độ mô phỏng, không thu tiền thật.</p>
    </fieldset>
  );
}
