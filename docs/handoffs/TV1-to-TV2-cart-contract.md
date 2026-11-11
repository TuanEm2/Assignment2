# Bàn giao TV1 → TV2: Cart Store (Assignment 2)

**Chủ module:** TV1, nhánh `feature/tv1-devops`.
**TV2 sử dụng:** giao diện giỏ hàng và checkout, trên nhánh riêng.

## Các file

- `apps/web/src/lib/cart/types.ts`: Kiểu dữ liệu CartLine, CartOption.
- `apps/web/src/lib/cart/calculations.ts`: Giá, số lượng, mã dòng giỏ.
- `apps/web/src/stores/cart-store.ts`: Zustand store và localStorage persist.
- `tests/cart-calculations.test.mjs`: Unit test tính tiền.

## API Cart Store (chỉ chạy ở client)

- `useCartStore(s => s.items)`: các dòng giỏ.
- `useCartStore(s => s.addItem)`: thêm sản phẩm với size, topping và số lượng.
- `useCartStore(s => s.removeItem)`: xóa dòng theo lineId.
- `useCartStore(s => s.setQuantity)`: thay đổi số lượng (0 để xóa; tối đa 99).
- `useCartStore(s => s.clearCart)`: xóa giỏ sau khi xác nhận thanh toán thành công.
- `useCartStore(selectCartSubtotal)`: tổng tạm tính.
- `useCartStore(selectCartItemCount)`: tổng số món.

## Ví dụ cho TV2

```tsx
'use client';
import { useCartStore, selectCartSubtotal } from '@/stores/cart-store';

export function CartSummary() {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectCartSubtotal);
  return <p>{items.length} dòng — {subtotal.toLocaleString('vi-VN')} ₫</p>;
}
```

Giá/size/topping thực tế lấy từ Product API, không hardcode. Next.js cần xử lý Zustand persist hydration khi hiển thị giỏ lần đầu.

**Quy tắc an toàn:** subtotal client và localStorage có thể bị chỉnh sửa. Khi POST /orders, backend phải truy vấn giá, kiểm tra tùy chọn và tồn kho trong database. Payment backend phải sử dụng số tiền đã lưu của đơn hàng.

## Kiểm thử

Từ thư mục gốc repository:

```powershell
npm ci
npm run test:cart
npm run build:web
```

TV2 lấy nền tảng từ TV1:

```powershell
git fetch origin
git switch -c feature/tv2-cart origin/feature/tv1-devops
```

Không push thẳng vào `main` trước khi hoàn thành các cổng nghiệm thu Task theo đề.
