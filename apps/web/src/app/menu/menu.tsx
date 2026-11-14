'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import './menu.css';
import { getProductsUrl } from '../../lib/products/url';

export interface Product {
  id: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  imageUrl?: string;
  availableCups?: number | null;
}

type Loader = (signal: AbortSignal) => Promise<Product[]>;

const ALL = '__all__';

const money = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

// Đúng 4 món, giá và đường dẫn ảnh trong seed TV2.
// ID demo chỉ dùng để xem giao diện.
const demo: Product[] = [
  {
    id: 'demo-ca-phe-sua',
    name: 'Cà phê sữa',
    price: 35000,
    imageUrl: '/images/products/ca-phe-sua.jpg',
  },
  {
    id: 'demo-americano',
    name: 'Americano',
    price: 40000,
    imageUrl: '/images/products/americano.jpg',
  },
  {
    id: 'demo-cappuccino',
    name: 'Cappuccino',
    price: 45000,
    imageUrl: '/images/products/cappuccino.jpg',
  },
  {
    id: 'demo-tra-dao',
    name: 'Trà đào',
    price: 39000,
    imageUrl: '/images/products/tra-dao.jpg',
  },
];

// Contract tạm thời: API trả về mảng sản phẩm.
// Cần đối chiếu với Products API của TV3 khi tích hợp.
export function parseProducts(value: unknown): Product[] {
  if (!Array.isArray(value)) {
    throw new Error('API phải trả về mảng sản phẩm.');
  }

  const ids = new Set<string>();

  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object') {
      throw new Error('Sản phẩm không hợp lệ.');
    }

    const row = item as Record<string, unknown>;

    const validId =
      (typeof row.id === 'string' && row.id.trim().length > 0) ||
      (typeof row.id === 'number' &&
        Number.isSafeInteger(row.id) &&
        row.id > 0);

    if (
      !validId ||
      typeof row.name !== 'string' ||
      !row.name.trim() ||
      typeof row.price !== 'number' ||
      !Number.isSafeInteger(row.price) ||
      row.price < 0
    ) {
      throw new Error('Thiếu id/name hoặc giá VND không hợp lệ.');
    }

    const id = String(row.id).trim();

    if (ids.has(id)) {
      throw new Error('Mã sản phẩm trùng nhau.');
    }

    ids.add(id);

    const result: Product = {
      id,
      name: row.name.trim(),
      price: row.price,
    };

    for (const key of ['category', 'description', 'imageUrl'] as const) {
      if (typeof row[key] === 'string' && row[key].trim()) {
        result[key] = row[key].trim();
      }
    }

    if (row.availableCups === null) result.availableCups = null;
    else if (typeof row.availableCups === 'number' && Number.isSafeInteger(row.availableCups) && row.availableCups >= 0) {
      result.availableCups = row.availableCups;
    }
    return result;
  });
}

export const getProducts: Loader = async (signal) => {
  const source = process.env.NEXT_PUBLIC_MENU_DATA_SOURCE ?? 'demo';

  signal.throwIfAborted();

  if (source === 'demo') {
    return demo;
  }

  if (source !== 'api') {
    throw new Error('Nguồn menu phải là demo hoặc api.');
  }

  const response = await fetch(getProductsUrl(), {
    signal,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return parseProducts(await response.json());
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}

// Minh họa dự phòng khi sản phẩm chưa có ảnh hoặc ảnh bị lỗi.
function Cup({ category = '' }: { category?: string }) {
  const fill = category.includes('Matcha')
    ? '#8daa75'
    : category.includes('Trà')
      ? '#e7a44a'
      : '#8a573d';

  return (
    <svg
      className="tv4-cup"
      viewBox="0 0 240 190"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="122"
        cy="169"
        rx="65"
        ry="9"
        fill="#233f32"
        opacity=".1"
      />

      <path
        d="M83 47h78l-10 108c-1 11-57 11-58 0L83 47Z"
        fill="#fffdf5"
        stroke="#d4c8b6"
        strokeWidth="2"
      />

      <path
        d="M89 80h66l-7 73c-1 8-51 8-52 0l-7-73Z"
        fill={fill}
      />

      <path
        d="m140 18-12 86"
        stroke="#41634e"
        strokeWidth="6"
        strokeLinecap="round"
      />

      <path
        d="M80 47c0-8 84-8 84 0v8H80v-8Z"
        fill="#e7e0d1"
        stroke="#d4c8b6"
        strokeWidth="2"
      />

      <path
        d="m100 92 14-3 3 14-14 3-3-14Zm26 24 16-2 2 13-16 2-2-13Z"
        fill="white"
        opacity=".35"
      />

      <path
        d="m98 63 6 87"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        opacity=".5"
      />

      <circle cx="122" cy="128" r="19" fill="#faf8ee" />

      <text
        x="111"
        y="137"
        fill="#41634e"
        fontSize="28"
        fontFamily="Georgia"
      >
        b.
      </text>
    </svg>
  );
}

function ProductCard({
  product,
  detailEnabled,
}: {
  product: Product;
  detailEnabled: boolean;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);

  return (
    <article className="tv4-card">
      <div className="tv4-art">
        {product.imageUrl && failedImage !== product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            width="400"
            height="240"
            loading="lazy"
            onError={() => setFailedImage(product.imageUrl ?? null)}
          />
        ) : (
          <Cup category={product.category} />
        )}

        <span className="tv4-tag">
          {product.category ?? 'Đồ uống'}
        </span>
      </div>

      <div className="tv4-card-body">
        <h3>{product.name}</h3>

        <p>
          {product.description ??
            'Một lựa chọn cho khoảng nghỉ của bạn.'}
        </p>

        {detailEnabled && product.availableCups !== undefined && product.availableCups !== null && (
          <p className="mt-2 text-sm font-semibold text-emerald-900" aria-label="Số ly còn lại">
            {product.availableCups === 0
              ? 'Hết nguyên liệu cho size S'
              : `Còn khoảng ${product.availableCups} ly (size S, không topping)`}
          </p>
        )}
        <div className="tv4-card-bottom">
          <strong>{money.format(product.price)}</strong>

          {detailEnabled ? (
            <Link
              href={`/products/${encodeURIComponent(product.id)}`}
              aria-label={`Chọn món ${product.name}`}
              className="tv4-choose"
            >
              Chọn món ↗
            </Link>
          ) : (
            <button type="button" disabled>
              Chi tiết sắp có
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function Menu({ loader = getProducts }: { loader?: Loader }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);

  const source = process.env.NEXT_PUBLIC_MENU_DATA_SOURCE ?? 'demo';

  const detailEnabled =
    source === 'api' &&
    process.env.NEXT_PUBLIC_PRODUCT_DETAIL_ENABLED === 'true';

  useEffect(() => {
    const controller = new AbortController();

    void Promise.resolve()
      .then(() => loader(controller.signal))
      .then((data) => {
        if (!controller.signal.aborted) {
          setProducts(data);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [loader, attempt]);

  const categories = [
    ...new Set(products.map((product) => product.category ?? 'Đồ uống')),
  ];

  const visible = products.filter(
    (product) =>
      (category === ALL ||
        (product.category ?? 'Đồ uống') === category) &&
      normalize(
        `${product.name} ${product.description ?? ''}`,
      ).includes(normalize(query)),
  );

  function retry() {
    setLoading(true);
    setError(false);
    setProducts([]);
    setCategory(ALL);
    setAttempt((value) => value + 1);
  }

  return (
    <div className="tv4-menu" lang="vi">
      <a href="#tv4-list" className="tv4-skip">
        Đến danh sách món
      </a>

      <header className="tv4-header">
        <a href="/menu" className="tv4-brand">
          BrewLite<span>®</span>
        </a>

        <a href="#tv4-list">Khám phá menu ↗</a>
      </header>

      <main className="tv4-main">
        <section className="tv4-hero" aria-labelledby="tv4-title">
          <div>
            <p className="tv4-eyebrow">
              MỘT CHÚT THẢNH THƠI MỖI NGÀY
            </p>

            <h1 id="tv4-title">
              Ngày thêm vui,
              <br />
              thêm một <em>chút vị.</em>
            </h1>

            <p>
              Cà phê đậm đà, trà thanh mát.
              <br />
              Tìm một món hợp gu cho khoảng nghỉ của bạn.
            </p>

            <a href="#tv4-list" className="tv4-primary">
              Hôm nay uống gì? ↓
            </a>
          </div>

          <div className="tv4-hero-art" aria-hidden="true">
            <Cup />
            <span>
              Pha chút
              <br />
              <em>niềm vui</em>
            </span>
          </div>
        </section>

        {source === 'demo' && (
          <aside className="tv4-demo">
            <strong>BẢN DEMO</strong>
            Dữ liệu mẫu để xem giao diện. Chức năng đặt món chưa được mở.
          </aside>
        )}

        <section
          id="tv4-list"
          className="tv4-section"
          aria-labelledby="tv4-list-title"
          tabIndex={-1}
        >
          <div className="tv4-toolbar">
            <div>
              <p className="tv4-eyebrow">CHỌN MỘT MÓN HỢP GU</p>
              <h2 id="tv4-list-title">Menu nhà BrewLite.</h2>
            </div>

            <input
              type="search"
              aria-label="Tìm đồ uống"
              placeholder="Tìm món bạn thích…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {!loading && !error && products.length > 0 && (
            <div className="tv4-filter-row">
              <div
                className="tv4-filters"
                role="group"
                aria-label="Lọc theo danh mục"
              >
                {[ALL, ...categories].map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={category === item}
                    onClick={() => setCategory(item)}
                  >
                    {item === ALL ? 'Tất cả' : item}
                  </button>
                ))}
              </div>

              <p aria-live="polite">{visible.length} món</p>
            </div>
          )}

          {loading ? (
            <div role="status" aria-label="Đang tải menu">
              <p>Đang chuẩn bị menu cho bạn…</p>

              <div className="tv4-grid" aria-hidden="true">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="tv4-skeleton" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="tv4-state" role="alert">
              <h3>Chưa thể tải menu</h3>
              <p>Bạn kiểm tra kết nối rồi thử lại nhé.</p>

              <button
                className="tv4-primary"
                type="button"
                onClick={retry}
              >
                Thử lại
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="tv4-state" role="status">
              <h3>Menu đang được cập nhật</h3>
              <p>Bạn quay lại sau để khám phá những món mới nhé.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="tv4-state" role="status">
              <h3>Chưa tìm thấy món phù hợp</h3>
              <p>Thử tên món khác hoặc xem tất cả đồ uống.</p>

              <button
                className="tv4-primary"
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory(ALL);
                }}
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <ul className="tv4-grid" aria-label="Danh sách đồ uống">
              {visible.map((product) => (
                <li key={product.id}>
                  <ProductCard
                    product={product}
                    detailEnabled={detailEnabled}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="tv4-footer">
        <strong>BrewLite®</strong>
        <span>Một chút vị. Một ngày vui.</span>
      </footer>
    </div>
  );
}