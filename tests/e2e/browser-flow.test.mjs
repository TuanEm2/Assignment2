import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

/**
 * TV6 Real Browser End-to-End (E2E) Test Suite (Task 5.2 & Task 5.4)
 *
 * Kiểm thử tự động hóa trực tiếp trên trình duyệt Web thật (tương tự Selenium / Playwright):
 * Luồng hoàn chỉnh:
 * 1. Đăng ký tài khoản khách hàng mới (/register)
 * 2. Đăng nhập hệ thống và xác thực session (/login)
 * 3. Duyệt danh mục đồ uống trên thực đơn (/menu)
 * 4. Xem chi tiết sản phẩm, chọn Size, Topping và thêm vào giỏ (/products/:id)
 * 5. Kiểm tra tóm tắt giỏ hàng (/cart)
 * 6. Đặt hàng và thực hiện thanh toán qua Mock Payment (/checkout)
 * 7. Kiểm tra kết quả thanh toán thành công (phase: paid)
 * 8. Xem danh sách Lịch sử đơn hàng (/orders)
 * 9. Xem Chi tiết đơn hàng snapshot món và thông tin thanh toán thật (/orders/:id)
 * 10. Kiểm thử bảo mật quyền sở hữu (Tài khoản B không thể xem đơn của Tài khoản A)
 */

const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:4000';
const isHeadless = process.env.HEADED !== 'true' && process.env.HEADLESS !== 'false';
const slowMoMs = process.env.SLOWMO ? Number(process.env.SLOWMO) : (isHeadless ? 0 : 1000);

test('[E2E Browser 1] Chạy thông suốt toàn bộ luồng nghiệp vụ trực tiếp trên trình duyệt Web', async () => {
  // 1. Kiểm tra tính sẵn sàng của Web và API server
  try {
    const apiPing = await fetch(`${API_URL}/api/products`);
    assert.equal(apiPing.status, 200, 'Backend API phải đang chạy trên port 4000');
    const webPing = await fetch(WEB_URL);
    assert.equal(webPing.status, 200, 'Frontend Web phải đang chạy trên port 3000');
  } catch (err) {
    throw new Error(
      `Không thể kết nối đến Web (${WEB_URL}) hoặc API (${API_URL}). Hãy đảm bảo đã chạy 'npm run dev:api' và 'npm run dev:web' trước khi chạy E2E test. Chi tiết: ${err.message}`,
    );
  }

  // 2. Khởi chạy trình duyệt Microsoft Edge / Chromium thật
  console.log(`\n🚀 [Browser Launch] Khởi động trình duyệt (headless: ${isHeadless}, slowMo: ${slowMoMs}ms)...`);
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: isHeadless,
    slowMo: slowMoMs, // Độ trễ giữa mỗi thao tác để người xem dễ dàng quan sát
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const timestamp = Date.now();
  const testEmailA = `customer_a_${timestamp}@brewlite.vn`;
  const testPassword = 'PasswordE2E2026!';
  const testNameA = 'Khách Hàng A (E2E Test)';
  let createdOrderId = '';

  try {
    // -------------------------------------------------------------------------
    // BƯỚC 1: Đăng ký tài khoản mới trên giao diện Web (/register)
    // -------------------------------------------------------------------------
    console.log(`\n[Bước 1/8] Mở trang Đăng ký và điền form: ${testEmailA}...`);
    await page.goto(`${WEB_URL}/register`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(isHeadless ? 300 : 1000);

    await page.fill('#name', testNameA);
    await page.fill('#reg-email', testEmailA);
    await page.fill('#reg-password', testPassword);
    await page.fill('#confirmPassword', testPassword);

    await Promise.all([
      page.waitForURL(/\/login|\/menu/, { timeout: 15000 }),
      page.click('button[type="submit"]'),
    ]);
    console.log(' -> Đăng ký thành công, đã chuyển hướng!');
    if (!isHeadless) await page.waitForTimeout(1000);

    // -------------------------------------------------------------------------
    // BƯỚC 2: Đăng nhập vào hệ thống (/login)
    // -------------------------------------------------------------------------
    if (page.url().includes('/login')) {
      console.log('[Bước 2/8] Đang ở trang Đăng nhập, tiến hành đăng nhập...');
      await page.waitForTimeout(isHeadless ? 200 : 800);
      await page.fill('#email', testEmailA);
      await page.fill('#password', testPassword);

      await Promise.all([
        page.waitForURL(/\/menu/, { timeout: 15000 }),
        page.click('button[type="submit"]'),
      ]);
      console.log(' -> Đăng nhập thành công, đã lưu phiên JWT vào Web!');
      if (!isHeadless) await page.waitForTimeout(1200);
    }

    // -------------------------------------------------------------------------
    // BƯỚC 3: Chọn món từ Thực đơn (/menu) sang trang chi tiết (/products/:id)
    // -------------------------------------------------------------------------
    console.log('\n[Bước 3/8] Duyệt Thực đơn (/menu) và chọn đồ uống...');
    await page.goto(`${WEB_URL}/menu`, { waitUntil: 'domcontentloaded' });

    // Chờ danh sách sản phẩm hiển thị trên menu
    const productLink = page.locator('a[href^="/products/"]').first();
    await productLink.waitFor({ state: 'visible', timeout: 10000 });
    const productHref = await productLink.getAttribute('href');
    console.log(` -> Tìm thấy sản phẩm: ${productHref}. Đang mở chi tiết món...`);

    await productLink.click();
    await page.waitForURL((url) => url.pathname.includes('/products/'), { timeout: 10000 });

    // -------------------------------------------------------------------------
    // BƯỚC 4: Tùy chỉnh Size, Topping và thêm vào Giỏ hàng
    // -------------------------------------------------------------------------
    console.log('[Bước 4/8] Chọn Size, Topping và bấm "Thêm vào giỏ"...');
    await page.locator('article.detail-card h1').waitFor({ state: 'visible', timeout: 8000 });

    // Chọn size thứ 2 (Size M) nếu có
    const sizeRadios = page.locator('input[type="radio"][name="size"]');
    const sizeCount = await sizeRadios.count();
    if (sizeCount > 1) {
      await sizeRadios.nth(1).check();
    }

    // Chọn topping nếu có
    const toppingCheckboxes = page.locator('input[type="checkbox"]');
    const toppingCount = await toppingCheckboxes.count();
    if (toppingCount > 0) {
      await toppingCheckboxes.first().check();
    }

    // Đổi số lượng lên 2
    const quantityInput = page.locator('.detail-quantity input');
    await quantityInput.fill('2');

    // Nhấn nút "Thêm vào giỏ"
    const addToCartBtn = page.locator('button:has-text("Thêm vào giỏ")');
    await addToCartBtn.click();

    // Chờ thông báo đã thêm vào giỏ
    const notice = page.locator('p[aria-label="Thông báo giỏ hàng"]');
    await notice.waitFor({ state: 'visible', timeout: 5000 });
    console.log(' -> Thông báo giỏ hàng:', await notice.textContent());

    // -------------------------------------------------------------------------
    // BƯỚC 5: Xem Giỏ hàng (/cart) và Chuyển sang Thanh toán (/checkout)
    // -------------------------------------------------------------------------
    console.log('\n[Bước 5/8] Mở Giỏ hàng (/cart)...');
    await page.goto(`${WEB_URL}/cart`, { waitUntil: 'domcontentloaded' });

    // Kiểm tra món ăn đã nằm trong giỏ
    const cartItems = page.locator('ul[aria-label="Đồ uống trong giỏ"] li');
    await cartItems.first().waitFor({ state: 'visible', timeout: 5000 });
    const itemCount = await cartItems.count();
    assert.ok(itemCount > 0, 'Giỏ hàng phải chứa ít nhất 1 món');
    console.log(` -> Giỏ hàng đã có ${itemCount} dòng món.`);

    // Nhấn nút "Thanh toán" sang màn hình checkout
    const checkoutLink = page.locator('a[href="/checkout"]');
    await checkoutLink.click();
    await page.waitForURL((url) => url.pathname.includes('/checkout'), { timeout: 8000 });
    console.log(' -> Đã chuyển sang màn hình Thanh toán (/checkout)!');

    // -------------------------------------------------------------------------
    // BƯỚC 6: Xác nhận thanh toán & Nhận mã đơn
    // -------------------------------------------------------------------------
    console.log('[Bước 6/8] Xác nhận thanh toán qua Mock Wallet...');
    const walletRadio = page.locator('input[value="MOCK_WALLET"]');
    await walletRadio.check();

    const payBtn = page.locator('button[type="submit"]');
    await payBtn.click();

    // Chờ thông báo "Thanh toán thành công" xuất hiện trên giao diện
    const successHeading = page.locator('h2:has-text("Thanh toán thành công")');
    await successHeading.waitFor({ state: 'visible', timeout: 15000 });
    console.log(' -> 🎉 Giao diện hiển thị: Thanh toán thành công!');

    // Lấy OrderId hiển thị trên màn hình
    const orderIdText = await page.locator('p:has-text("Mã đơn")').textContent();
    createdOrderId = orderIdText.replace('Mã đơn', '').trim();
    console.log(' -> Mã đơn tạo thành công:', createdOrderId);
    if (!isHeadless) await page.waitForTimeout(1500);

    // -------------------------------------------------------------------------
    // BƯỚC 7: Xem Lịch sử đơn hàng (/orders)
    // -------------------------------------------------------------------------
    console.log('\n[Bước 7/8] Kiểm tra Lịch sử đơn hàng (/orders)...');
    const historyLink = page.locator('a:has-text("Lịch sử đơn hàng")');
    await historyLink.click();
    await page.waitForURL((url) => url.pathname.includes('/orders'), { timeout: 8000 });

    const firstOrderCard = page.locator('.orders-list .order-card').first();
    await firstOrderCard.waitFor({ state: 'visible', timeout: 8000 });

    const statusBadge = firstOrderCard.locator('.status-badge');
    await statusBadge.waitFor({ state: 'visible' });
    const badgeText = await statusBadge.textContent();
    console.log(` -> Đơn hàng trong lịch sử có trạng thái: "${badgeText.trim()}"`);
    assert.ok(badgeText.includes('Đã thanh toán'), 'Trạng thái đơn phải là Đã thanh toán');

    // -------------------------------------------------------------------------
    // BƯỚC 8: Mở Chi tiết đơn hàng (/orders/[id]) và đối chiếu dữ liệu thật
    // -------------------------------------------------------------------------
    console.log('[Bước 8/8] Mở Chi tiết đơn hàng (/orders/[id])...');
    await firstOrderCard.click();
    await page.waitForURL((url) => /\/orders\/[0-9a-f-]+/i.test(url.pathname), { timeout: 8000 });

    const detailTitle = page.locator('h1:has-text("Đơn hàng #")');
    await detailTitle.waitFor({ state: 'visible', timeout: 8000 });
    console.log(' -> Đã mở trang Chi tiết đơn hàng:', await detailTitle.textContent());

    const itemsTable = page.locator('.order-items-table');
    await itemsTable.waitFor({ state: 'visible' });

    const paymentInfo = page.locator('.order-payment-info');
    await paymentInfo.waitFor({ state: 'visible' });
    console.log(' -> Thông tin thanh toán thật:', (await paymentInfo.textContent()).trim());
    if (!isHeadless) await page.waitForTimeout(2000);

    // -------------------------------------------------------------------------
    // BƯỚC 9: BẢO MẬT: Khách hàng B đăng nhập và thử truy cập đơn của Khách hàng A
    // -------------------------------------------------------------------------
    console.log('\n[Bảo mật] Kiểm thử phân quyền: Khách B mở phiên trình duyệt riêng và cố truy cập đơn của Khách A...');
    const testEmailB = `customer_b_${timestamp}@brewlite.vn`;
    const testNameB = 'Khách Hàng B (Người Lạ)';

    // Khởi tạo ngữ cảnh trình duyệt độc lập cho Khách B (tách biệt session với Khách A)
    const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageB = await contextB.newPage();

    try {
      // Đăng ký tài khoản Khách B
      await pageB.goto(`${WEB_URL}/register`, { waitUntil: 'domcontentloaded' });
      await pageB.waitForTimeout(isHeadless ? 300 : 1000);
      await pageB.fill('#name', testNameB);
      await pageB.fill('#reg-email', testEmailB);
      await pageB.fill('#reg-password', testPassword);
      await pageB.fill('#confirmPassword', testPassword);

      await Promise.all([
        pageB.waitForURL(/\/login|\/menu/, { timeout: 15000 }),
        pageB.click('button[type="submit"]'),
      ]);
      if (!isHeadless) await pageB.waitForTimeout(1000);

      // Nếu chuyển sang trang /login thì đăng nhập
      if (pageB.url().includes('/login')) {
        await pageB.waitForTimeout(isHeadless ? 200 : 800);
        await pageB.fill('#email', testEmailB);
        await pageB.fill('#password', testPassword);
        await Promise.all([
          pageB.waitForURL(/\/menu/, { timeout: 15000 }),
          pageB.click('button[type="submit"]'),
        ]);
        if (!isHeadless) await pageB.waitForTimeout(1200);
      }

      // Khách B cố tình nhập trực tiếp URL đơn hàng của Khách A
      console.log(` -> Khách B truy cập trái phép URL đơn của Khách A: /orders/${createdOrderId}...`);
      await pageB.goto(`${WEB_URL}/orders/${createdOrderId}`, { waitUntil: 'domcontentloaded' });

      // Kiểm tra thông báo lỗi bảo mật 404 (Server không trả về đơn của người khác)
      const alertBox = pageB.locator('.order-card[role="alert"]');
      await alertBox.waitFor({ state: 'visible', timeout: 10000 });
      const alertText = await alertBox.textContent();
      console.log(' -> Phản hồi bảo mật:', alertText.trim());
      assert.ok(
        alertText.includes('không có quyền truy cập') || alertText.includes('Không tìm thấy'),
        'Khách B không được xem đơn của Khách A',
      );
      if (!isHeadless) await pageB.waitForTimeout(2000);
    } finally {
      await contextB.close();
    }

    console.log('\n============================================================');
    console.log('✅ CHÚC MỪNG: TOÀN BỘ LUỒNG E2E TRÊN WEB ĐÃ CHẠY VÀ PASS 100%!');
    console.log('============================================================\n');
    if (!isHeadless) await page.waitForTimeout(2500);
  } finally {
    await browser.close();
  }
});
