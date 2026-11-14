import type { Metadata } from 'next';
import { CheckoutScreen } from './checkout-screen';

export const metadata: Metadata = { title: 'Thanh toán | BrewLite' };

export default function CheckoutPage() {
  return <CheckoutScreen />;
}
