'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getProductDetail, getProductAvailability, type ProductDetail as Product } from '@/lib/products/detail';
import { useCartStore } from '@/stores/cart-store';
import './product-detail.css';

type Loader = (id: string, signal: AbortSignal) => Promise<Product>;
const money = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

export function ProductDetail({ productId, loader = getProductDetail }: { productId: string; loader?: Loader }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [sizeId, setSizeId] = useState('');
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState('1');
  const [notice, setNotice] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const [availableCups, setAvailableCups] = useState<number | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState(false);
  const addItem = useCartStore(s => s.addItem);

  useEffect(() => {
    const controller = new AbortController();
    // Loader được gọi trong effect; cleanup chặn phản hồi cũ ghi vào sản phẩm mới.
    loader(productId, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      setProduct(data);
      setSizeId(data.sizes.find(s => s.name === 'S')?.id ?? data.sizes[0]?.id ?? '');
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được đồ uống.');
    });
    return () => controller.abort();
  }, [productId, retry, loader]);

  useEffect(() => {
    if (!product || product.id !== productId || !sizeId) return;
    const controller = new AbortController();
    setStockLoading(true);
    setAvailableCups(null);
    setStockError(false);
    void getProductAvailability(product.id, sizeId, toppingIds, controller.signal)
      .then((cups) => { if (!controller.signal.aborted) setAvailableCups(cups); })
      .catch(() => { if (!controller.signal.aborted) setStockError(true); })
      .finally(() => { if (!controller.signal.aborted) setStockLoading(false); });
    return () => controller.abort();
  }, [product, productId, sizeId, toppingIds]);

  const size = product?.sizes.find(s => s.id === sizeId) ?? null;
  const toppings = product?.toppings.filter(t => toppingIds.includes(t.id)) ?? [];
  const count = Number(quantity);
  const valid = Number.isSafeInteger(count) && count >= 1 && count <= 99;
  const exceedsStock = availableCups !== null && count > availableCups;
  const unitPrice = (product?.price ?? 0) + (size?.price ?? 0) + toppings.reduce((n, t) => n + t.price, 0);

  function addSelectedProduct() {
    if (!product || !valid || exceedsStock || (product.sizes.length > 0 && !size)) return;
    addItem({ productId: product.id, productName: product.name, basePrice: product.price,
      imageUrl: product.imageUrl, size, toppings, quantity: count });
    setNotice(`Đã thêm ${count} ${product.name} vào giỏ.`);
  }

  return <main className="detail-page">
    <nav aria-label="Điều hướng sản phẩm"><Link href="/menu">← Menu đồ uống</Link><Link href="/cart">Xem giỏ hàng</Link></nav>
    {error ? <section role="alert"><h1>Không tải được đồ uống</h1><p>{error}</p><button onClick={() => {
      setError(''); setProduct(null); setNotice(''); setRetry(n => n + 1);
    }}>Thử lại</button></section> : !product ? <p role="status">Đang tải đồ uống...</p> : <article className="detail-card">
      <div className="detail-photo">{imageFailed ? <p>Chưa có ảnh đồ uống</p> :
        // eslint-disable-next-line @next/next/no-img-element -- ảnh local có fallback khi lỗi
        <img src={product.imageUrl} alt={product.name} onError={() => setImageFailed(true)} />}</div>
      <section>
        <p className="detail-eyebrow">BREWLITE</p><h1>{product.name}</h1><p>Giá gốc: {money(product.price)}</p>
        <fieldset><legend>Chọn size</legend>{product.sizes.length ? product.sizes.map(s =>
          <label key={s.id}><input type="radio" name="size" value={s.id} checked={sizeId === s.id} onChange={() => { setSizeId(s.id); setNotice(''); }} />
            {s.name} (+{money(s.price)})</label>) : <p>Đồ uống không có tùy chọn size.</p>}</fieldset>
        <fieldset><legend>Chọn topping</legend>{product.toppings.length ? product.toppings.map(t =>
          <label key={t.id}><input type="checkbox" checked={toppingIds.includes(t.id)} onChange={() => {
            setToppingIds(ids => ids.includes(t.id) ? ids.filter(id => id !== t.id) : [...ids, t.id]); setNotice('');
          }} />{t.name} (+{money(t.price)})</label>) : <p>Không có topping bổ sung.</p>}</fieldset>
        <label className="detail-quantity">Số lượng<input type="number" min="1" max={Math.min(99, availableCups ?? 99)} step="1" value={quantity} onChange={e => { setQuantity(e.target.value); setNotice(''); }} /></label>
        {!valid && <p role="alert">Số lượng phải là số nguyên từ 1 đến 99.</p>}
        <p aria-live="polite" className="text-sm">
          {stockLoading ? 'Đang kiểm tra nguyên liệu còn lại…' :
            stockError ? 'Chưa thể kiểm tra tồn kho. Hệ thống sẽ kiểm tra khi đặt đơn.' :
            availableCups === null ? 'Chọn size để kiểm tra số ly còn lại.' :
            availableCups === 0 ? 'Hết nguyên liệu cho lựa chọn này.' :
            `Ước tính còn ${availableCups} ly với size và topping đã chọn.`}
        </p>
        {exceedsStock && <p role="alert">Số lượng vượt quá nguyên liệu có thể pha hiện tại.</p>}
        <p className="detail-total">Tạm tính: <output aria-label="Tổng tạm tính">{money(unitPrice * (valid ? count : 0))}</output></p>
        <p>Giá và tồn kho sẽ được kiểm tra lại khi đặt đơn.</p>
        <button disabled={!valid || exceedsStock || (product.sizes.length > 0 && !size)} onClick={addSelectedProduct}>Thêm vào giỏ</button>
        {notice && <p role="status" aria-label="Thông báo giỏ hàng">{notice}</p>}
      </section>
    </article>}
  </main>;
}
