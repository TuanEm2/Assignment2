import type { Metadata } from 'next';
import { Menu } from './menu';

export const metadata: Metadata = {
  title: 'Menu | BrewLite',
  description: 'Khám phá menu đồ uống tại BrewLite.',
};

export default function MenuPage() {
  return <Menu />;
}