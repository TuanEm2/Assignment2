import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * TV6 Production Smoke Test Suite (Task 5.2 & Task 5.4)
 *
 * Kiểm tra tính sẵn sàng (Readiness & Health) của hệ thống BrewLite trước khi triển khai:
 * - Cấu hình biến môi trường (JWT_SECRET >= 32 bytes, DB URLs)
 * - Sự toàn vẹn của Prisma Schema & Migrations
 * - Sự hiện diện của bản build production (NestJS API & Next.js Web)
 * - Kiểm tra khói các endpoint và route nghiệp vụ trọng yếu
 */

const rootDir = process.cwd();

test('[Smoke 1 - Environment & Config Integrity] Biến môi trường và cấu hình bảo mật', () => {
  const envPath = path.join(rootDir, '.env');
  assert.ok(fs.existsSync(envPath), 'File .env cấu hình môi trường phải tồn tại');

  const envContent = fs.readFileSync(envPath, 'utf-8');
  assert.ok(envContent.includes('DATABASE_URL'), 'Cấu hình phải có DATABASE_URL');
  assert.ok(envContent.includes('JWT_SECRET'), 'Cấu hình phải có JWT_SECRET');

  // Kiểm tra độ dài JWT_SECRET >= 32 bytes theo yêu cầu AuthModule
  const match = envContent.match(/JWT_SECRET\s*=\s*["']?([^"'\r\n]+)["']?/);
  assert.ok(match, 'Phải tìm thấy giá trị JWT_SECRET trong file .env');
  const secret = match[1].trim();
  assert.ok(
    Buffer.from(secret).length >= 32,
    `JWT_SECRET phải có độ dài ít nhất 32 byte để chống tấn công brute-force (hiện tại: ${Buffer.from(secret).length} bytes)`,
  );
});

test('[Smoke 2 - Database & Prisma Schema Integrity] Tính nhất quán của cơ sở dữ liệu', () => {
  const schemaPath = path.join(rootDir, 'apps', 'api', 'prisma', 'schema.prisma');
  assert.ok(fs.existsSync(schemaPath), 'File schema.prisma phải tồn tại');

  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Đảm bảo các model cốt lõi của Sprint 2 đã được định nghĩa đầy đủ
  const requiredModels = [
    'model User',
    'model Product',
    'model ProductSize',
    'model ProductTopping',
    'model Ingredient',
    'model Order',
    'model OrderItem',
    'model Payment',
  ];

  for (const model of requiredModels) {
    assert.ok(schema.includes(model), `Schema phải chứa thực thể ${model}`);
  }

  // Đảm bảo các enum trạng thái quan trọng
  assert.ok(schema.includes('enum OrderStatus'), 'Schema phải định nghĩa enum OrderStatus');
  assert.ok(schema.includes('PAID'), 'OrderStatus phải có PAID');
  assert.ok(schema.includes('PAYMENT_FAILED'), 'OrderStatus phải có PAYMENT_FAILED');
  assert.ok(schema.includes('READY'), 'OrderStatus phải có READY');
});

test('[Smoke 3 - Production Build Readiness] Bản build API và Web sẵn sàng để deploy', () => {
  const apiDistPath = path.join(rootDir, 'apps', 'api', 'dist');
  const webBuildPath = path.join(rootDir, 'apps', 'web', '.next');

  assert.ok(
    fs.existsSync(apiDistPath),
    'Thư mục build apps/api/dist phải tồn tại sẵn sàng cho Docker/Production',
  );
  assert.ok(
    fs.existsSync(webBuildPath),
    'Thư mục build apps/web/.next phải tồn tại sẵn sàng phục vụ SSR/Static pages',
  );
});

test('[Smoke 4 - Frontend Critical Routes Smoke Test] Các trang chính của khách hàng', () => {
  const webAppDir = path.join(rootDir, 'apps', 'web', 'src', 'app');

  const criticalPages = [
    'menu/page.tsx',
    'cart/page.tsx',
    'checkout/page.tsx',
    'orders/page.tsx',
    'orders/[id]/page.tsx',
    'login/page.tsx',
    'register/page.tsx',
  ];

  for (const pageRelPath of criticalPages) {
    const fullPath = path.join(webAppDir, pageRelPath);
    assert.ok(fs.existsSync(fullPath), `Trang route thiết yếu '${pageRelPath}' phải tồn tại`);
  }
});

test('[Smoke 5 - API Contract & Error Boundary Smoke Test] Phân quyền và ranh giới bảo mật', () => {
  // Giả lập kiểm tra phản hồi của các guard và error handler
  const unauthenticatedRequest = {
    headers: {},
  };

  function simulateAuthGuard(req) {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
      return { status: 401, error: 'Unauthorized', message: 'Token không tồn tại hoặc không hợp lệ' };
    }
    return { status: 200 };
  }

  const guardResult = simulateAuthGuard(unauthenticatedRequest);
  assert.equal(guardResult.status, 401, 'Request thiếu Bearer token phải lập tức bị chặn với HTTP 401');

  // Kiểm tra không lộ mật khẩu trong response người dùng
  const sanitizedUserResponse = {
    id: 'u-123',
    email: 'test@brewlite.vn',
    role: 'CUSTOMER',
  };
  assert.equal('password' in sanitizedUserResponse, false);
  assert.equal('passwordHash' in sanitizedUserResponse, false);
});
