import { Suspense } from 'react';
import { RegisterForm } from './register-form';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="auth-container">Đang tải...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
