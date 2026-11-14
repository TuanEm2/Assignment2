import { type INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TOKEN_AUDIENCE, TOKEN_ISSUER } from '../src/auth/access-tokens';
import { configureHttp } from '../src/http/app-http.config';
import { PrismaService } from '../src/prisma/prisma.service';

describe('TV5 push 2 — Auth, owned history, actual Orders/Inventory/Payment + PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let owner: { id: string; token: string };
  let stranger: { id: string; token: string };
  let empty: { id: string; token: string };
  let productId: string;
  let sizeId: string;
  let toppingId: string;
  let ingredientId: string;
  let orderId: string;
  let foreignOrderId: string;
  const prefix = `tv5-history-${randomUUID()}`;
  const emails: string[] = [];
  const password = 'Coffee-History-Test-42';
  const secret = 'tv5-history-test-only-signing-key-at-least-32-bytes';
  const previousSecret = process.env.JWT_SECRET;
  const previousMode = process.env.PAYMENT_MODE;
  const signer = new JwtService();
  const get = (path: string, token = owner.token) => request(app.getHttpServer()).get(`/api/orders/${path}`).set('Authorization', `Bearer ${token}`);

  async function account(label: string) {
    const email = `${prefix}-${label}@example.invalid`;
    emails.push(email);
    const registered = await request(app.getHttpServer()).post('/api/auth/register').send({ email, password }).expect(201);
    const login = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(200);
    return { id: registered.body.user.id as string, token: login.body.accessToken as string };
  }

  beforeAll(async () => {
    const value = process.env.BREWLITE_HISTORY_TEST_DATABASE_URL;
    if (!value) throw new Error('Set BREWLITE_HISTORY_TEST_DATABASE_URL to a dedicated migrated local _test PostgreSQL database.');
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !/(^|_)tests?(_|$)/i.test(url.pathname.slice(1))) {
      throw new Error('History E2E requires a local PostgreSQL database with _test in its name; never use application/production data.');
    }
    prisma = new PrismaService({ datasourceUrl: value });
    await prisma.$connect();
    process.env.JWT_SECRET = secret;
    process.env.PAYMENT_MODE = 'mock';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue(prisma).compile();
    app = module.createNestApplication({ logger: false });
    configureHttp(app);
    await app.init();
    owner = await account('owner');
    stranger = await account('other');
    empty = await account('empty');
    // Even a stored ADMIN is not authorized to use the customer's owner-only endpoints for others.
    await prisma.user.update({ where: { id: stranger.id }, data: { role: 'ADMIN' } });
    const product = await prisma.product.create({ data: {
      slug: prefix, name: 'History snapshot coffee', price: 40000, imageUrl: '/test',
      sizes: { create: { name: 'M', price: 5000 } },
      toppings: { create: { name: 'History cream', price: 3000 } },
    }, include: { sizes: true, toppings: true } });
    productId = product.id; sizeId = product.sizes[0].id; toppingId = product.toppings[0].id;
    const ingredient = await prisma.ingredient.create({ data: { code: prefix, name: prefix, unit: 'PIECE', stock: 100 } });
    ingredientId = ingredient.id;
    await prisma.productSizeIngredient.create({ data: { sizeId, ingredientId, quantity: 1 } });
    await prisma.productToppingIngredient.create({ data: { toppingId, ingredientId, quantity: 2 } });
    foreignOrderId = (await prisma.order.create({ data: { userId: stranger.id, total: 123, idempotencyKey: prefix } })).id;
  }, 30000);

  afterAll(async () => {
    try {
      await app?.close();
      if (prisma) {
        // Only data owned by this UUID-tagged test run. No reset, seed or global deletion.
        const ownUsers = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
        const ids = ownUsers.map(user => user.id);
        await prisma.paymentAttempt.deleteMany({ where: { order: { userId: { in: ids } } } });
        await prisma.payment.deleteMany({ where: { order: { userId: { in: ids } } } });
        await prisma.order.deleteMany({ where: { userId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
        if (productId) await prisma.product.delete({ where: { id: productId } });
        if (ingredientId) await prisma.ingredient.delete({ where: { id: ingredientId } });
      }
    } finally {
      await prisma?.$disconnect();
      if (previousSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousSecret;
      if (previousMode === undefined) delete process.env.PAYMENT_MODE;
      else process.env.PAYMENT_MODE = previousMode;
    }
  });

  it('all History routes require a real Bearer JWT', async () => {
    for (const path of ['me', foreignOrderId, `${foreignOrderId}/status`]) {
      await request(app.getHttpServer()).get(`/api/orders/${path}`).expect(401);
    }
  });

  it('empty history returns an array compatible with TV6, no-store and an exposed pagination header', async () => {
    const response = await get('me', empty.token).expect(200);
    expect(response.body).toEqual([]);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers['x-next-cursor']).toBe('');
    expect(response.headers['access-control-expose-headers']).toContain('X-Next-Cursor');
  });

  it('creates an owned PENDING order via real JWT/controller/pricing/ingredient stock and reads it back', async () => {
    const body = { items: [{ productId, sizeId, toppingIds: [toppingId], quantity: 2 }] };
    const key = randomUUID();
    const created = await request(app.getHttpServer()).post('/api/orders')
      .set('Authorization', `Bearer ${owner.token}`).set('Idempotency-Key', key).send(body).expect(201);
    orderId = created.body.id;
    expect(created.body).toMatchObject({ status: 'PENDING', total: 96000 });
    expect((await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredientId } })).stock).toBe(94);
    await request(app.getHttpServer()).post('/api/orders')
      .set('Authorization', `Bearer ${owner.token}`).set('Idempotency-Key', key).send(body).expect(201);
    expect((await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredientId } })).stock).toBe(94);
    const response = await get(orderId).expect(200);
    expect(response.body).toMatchObject({ id: orderId, status: 'PENDING', total: 96000, payment: null });
    expect(response.body.items[0]).toMatchObject({ productName: 'History snapshot coffee', sizeName: 'M', toppings: ['History cream'], quantity: 2, unitPrice: 48000, lineTotal: 96000, subtotal: 96000 });
    expect(response.body).not.toHaveProperty('userId');
    expect(response.body).not.toHaveProperty('idempotencyKey');
    expect(response.body).not.toHaveProperty('ingredientUsages');
    expect((await get('me').expect(200)).body[0]).toMatchObject({ id: orderId, total: 96000, itemCount: 2 });
  });

  it('non-owner and missing detail/status return the same 404, including a stored ADMIN account', async () => {
    for (const suffix of ['', '/status']) {
      const foreign = await get(`${orderId}${suffix}`, stranger.token).expect(404);
      const missing = await get(`${randomUUID()}${suffix}`, stranger.token).expect(404);
      expect(foreign.body).toEqual(missing.body);
    }
    const response = await get('me', stranger.token).expect(200);
    expect(response.body.map((row: { id: string }) => row.id)).toEqual([foreignOrderId]);
  });

  it('rejects owner injection, malformed IDs and malformed/repeated pagination values', async () => {
    for (const query of [`userId=${stranger.id}`, 'limit=0', 'limit=51', 'limit=-1', 'limit=1.5', 'limit=2&limit=3', 'cursor=invalid']) {
      await get(`me?${query}`).expect(400);
    }
    await get('not-a-uuid').expect(400);
    await get('not-a-uuid/status').expect(400);
    const foreign = await get(`me?cursor=${foreignOrderId}`).expect(400);
    const missing = await get(`me?cursor=${randomUUID()}`).expect(400);
    expect(foreign.body).toEqual(missing.body);
  });

  it('forged, expired and invalid-subject JWTs fail on history/detail/status', async () => {
    const options = { secret, issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE, expiresIn: 3600 };
    const tokens = [
      signer.sign({ sub: owner.id }, { ...options, secret: 'wrong-test-only-secret-at-least-32-bytes' }),
      signer.sign({ sub: owner.id }, { ...options, expiresIn: -60 }),
      signer.sign({ sub: 'invalid' }, options),
      signer.sign({ sub: owner.id }, { ...options, audience: 'wrong-audience' }),
    ];
    for (const path of ['me', orderId, `${orderId}/status`]) {
      for (const token of tokens) await get(path, token).expect(401);
    }
  });

  it('reads failed attempts then a successful payment and replay without making History mutate inventory/payment', async () => {
    const pay = (outcome: string, key: string) => request(app.getHttpServer()).post('/api/payments/mock')
      .set('Authorization', `Bearer ${owner.token}`).send({ orderId, method: 'MOCK_WALLET', outcome, idempotencyKey: key });
    await pay('FAILURE', randomUUID()).expect(200);
    expect((await get(`${orderId}/status`).expect(200)).body.status).toBe('PAYMENT_FAILED');
    await pay('FAILURE', randomUUID()).expect(200);
    const key = randomUUID();
    await pay('SUCCESS', key).expect(200);
    await pay('SUCCESS', key).expect(200);
    const before = await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredientId } });
    for (let index = 0; index < 3; index++) {
      expect((await get(orderId).expect(200)).body.payment).toMatchObject({ amount: 96000, method: 'MOCK_WALLET' });
      expect((await get(`${orderId}/status`).expect(200)).body.status).toBe('PAID');
      await get('me').expect(200);
    }
    expect(await prisma.payment.count({ where: { orderId } })).toBe(1);
    expect(await prisma.paymentAttempt.count({ where: { orderId } })).toBe(3);
    expect(await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredientId } })).toEqual(before);
  });

  it('keeps the saved name, size/topping and prices after the catalog changes', async () => {
    await prisma.product.update({ where: { id: productId }, data: { name: 'Changed catalog name', price: 1 } });
    await prisma.productSize.update({ where: { id: sizeId }, data: { price: 1 } });
    await prisma.productTopping.update({ where: { id: toppingId }, data: { name: 'Changed topping', price: 1 } });
    const response = await get(orderId).expect(200);
    expect(response.body.total).toBe(96000);
    expect(response.body.items[0]).toMatchObject({ productName: 'History snapshot coffee', toppings: ['History cream'], unitPrice: 48000, subtotal: 96000 });
  });

  it('paginates all saved statuses in stable date/UUID order without duplicates or foreign rows', async () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    for (const status of Object.values(OrderStatus)) {
      await prisma.order.create({ data: { userId: owner.id, total: 100, status, createdAt } });
    }
    const expected = await prisma.order.findMany({ where: { userId: owner.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } });
    const seen: string[] = [];
    let cursor = '';
    // Bounded loop so an invalid repeating cursor fails instead of hanging.
    for (let page = 0; page <= expected.length; page++) {
      const response = await get(`me?limit=2${cursor ? `&cursor=${cursor}` : ''}`).expect(200);
      expect(response.body.length).toBeLessThanOrEqual(2);
      seen.push(...response.body.map((row: { id: string }) => row.id));
      cursor = response.headers['x-next-cursor'];
      if (!cursor) break;
    }
    expect(seen).toEqual(expected.map(row => row.id));
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).not.toContain(foreignOrderId);
  });

  it('rejects deleted-account JWTs on history without trusting old token claims', async () => {
    await prisma.user.delete({ where: { id: empty.id } });
    await get('me', empty.token).expect(401);
  });
});
