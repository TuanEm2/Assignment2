import { type INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TOKEN_AUDIENCE, TOKEN_ISSUER } from '../src/auth/access-tokens';
import { configureHttp } from '../src/http/app-http.config';
import { PrismaService } from '../src/prisma/prisma.service';

describe('TV5 first-push Auth — real PostgreSQL + HTTP + JWT/hash', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let productId: string;
  let sizeId: string;
  const prefix = `tv5-${randomUUID()}`;
  const emails: string[] = [];
  const password = 'Coffee-Test-Only-42';
  const testSecret = 'tv5-postgres-test-only-jwt-secret-at-least-32-bytes';
  const previousSecret = process.env.JWT_SECRET;
  const signer = new JwtService();
  const email = (label: string) => {
    const value = `${prefix}-${label}@example.invalid`;
    emails.push(value);
    return value;
  };
  async function openApp() {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue(prisma).compile();
    const instance = module.createNestApplication({ logger: false });
    configureHttp(instance);
    await instance.init();
    return instance;
  }
  async function account(label: string) {
    const address = email(label);
    const response = await request(app.getHttpServer()).post('/api/auth/register')
      .send({ email: address, password }).expect(201);
    const login = await request(app.getHttpServer()).post('/api/auth/login')
      .send({ email: address, password }).expect(200);
    return { email: address, id: response.body.user.id as string, token: login.body.accessToken as string };
  }

  beforeAll(async () => {
    const value = process.env.BREWLITE_AUTH_TEST_DATABASE_URL;
    if (!value) throw new Error('Set BREWLITE_AUTH_TEST_DATABASE_URL to a dedicated migrated test database.');
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !/(^|_)tests?(_|$)/i.test(url.pathname.slice(1))) {
      throw new Error('Auth E2E requires a PostgreSQL database whose name contains _test. Never use application/production DB.');
    }
    prisma = new PrismaService({ datasourceUrl: value });
    await prisma.$connect();
    process.env.JWT_SECRET = testSecret;
    app = await openApp();
    const product = await prisma.product.create({ data: {
      slug: prefix, name: 'TV5 Auth isolated fixture', price: 40000, imageUrl: '/test',
      sizes: { create: { name: 'M', price: 5000 } },
      stock: { create: { quantity: 3 } },
    }, include: { sizes: true } });
    productId = product.id; sizeId = product.sizes[0].id;
  });

  afterAll(async () => {
    try {
      await app?.close();
      if (prisma) {
        // Exact fixture ownership only. No reset/seed/global delete is used.
        if (emails.length) await prisma.user.deleteMany({ where: { email: { in: emails } } });
        if (productId) await prisma.product.delete({ where: { id: productId } });
      }
    } finally {
      await prisma?.$disconnect();
      if (previousSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousSecret;
    }
  });

  it('persists a normalized account, optional name, salted password hash and CUSTOMER role', async () => {
    const address = email('normalize');
    const response = await request(app.getHttpServer()).post('/api/auth/register')
      .send({ email: ` ${address.toUpperCase()} `, password, name: '  TV5 DB Test  ' }).expect(201);
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: address } });
    expect(stored.id).toBe(response.body.user.id);
    expect(stored.name).toBe('TV5 DB Test');
    expect(stored.role).toBe('CUSTOMER');
    expect(stored.passwordHash).toMatch(/^scrypt\$/);
    expect(stored.passwordHash).not.toContain(password);
    expect(response.body).toEqual({ user: { id: stored.id, email: address, name: 'TV5 DB Test' } });
    await request(app.getHttpServer()).post('/api/auth/login')
      .send({ email: address.toUpperCase(), password }).expect(200);
  });

  it('real unique-email constraint allows only one concurrent registration', async () => {
    const address = email('race');
    const responses = await Promise.all([address, address.toUpperCase()].map(value => request(app.getHttpServer())
      .post('/api/auth/register').send({ email: value, password })));
    expect(responses.map(r => r.status).sort((a, b) => a - b)).toEqual([201, 409]);
    expect(await prisma.user.count({ where: { email: address } })).toBe(1);
  });

  it('login and guard continue working after the Nest application is restarted', async () => {
    const user = await account('restart');
    await app.close();
    app = await openApp();
    const login = await request(app.getHttpServer()).post('/api/auth/login')
      .send({ email: user.email, password }).expect(200);
    await request(app.getHttpServer()).get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`).expect(200)
      .expect({ user: { id: user.id, email: user.email } });
  });

  it('wrong password and nonexistent account fail without issuing a token', async () => {
    const user = await account('bad-login');
    const wrong = await request(app.getHttpServer()).post('/api/auth/login')
      .send({ email: user.email, password: 'Wrong-Test-Password-42' }).expect(401);
    const missing = await request(app.getHttpServer()).post('/api/auth/login')
      .send({ email: email('not-created'), password }).expect(401);
    expect(wrong.body.message).toBe(missing.body.message);
    expect(wrong.body).not.toHaveProperty('accessToken');
  });

  it('rejects invalid registration and client-assigned role without inserting users', async () => {
    const address = email('invalid');
    await request(app.getHttpServer()).post('/api/auth/register')
      .send({ email: address, password: 'short' }).expect(400);
    await request(app.getHttpServer()).post('/api/auth/register')
      .send({ email: address, password, role: 'ADMIN' }).expect(400);
    expect(await prisma.user.count({ where: { email: address } })).toBe(0);
  });

  it('protects POST /orders with real JWT and does not trust a userId in the body', async () => {
    const user = await account('orders');
    const body = { items: [{ productId, sizeId, toppingIds: [], quantity: 1 }] };
    await request(app.getHttpServer()).post('/api/orders').send(body).expect(401);
    await request(app.getHttpServer()).post('/api/orders').set('Authorization', `Bearer ${user.token}`)
      .send({ ...body, userId: randomUUID() }).expect(400);
    await request(app.getHttpServer()).post('/api/orders').set('Authorization', `Bearer ${user.token}`)
      .send({ ...body, total: 1 }).expect(400);
    const response = await request(app.getHttpServer()).post('/api/orders')
      .set('Authorization', `Bearer ${user.token}`).send(body).expect(503);
    // Inventory đã được nối; fixture Auth cũ chưa có công thức nguyên liệu.
    expect(response.body.code).toBe('INGREDIENT_RECIPE_NOT_CONFIGURED');
    expect(await prisma.order.count({ where: { userId: user.id } })).toBe(0);
    expect((await prisma.stock.findUniqueOrThrow({ where: { productId } })).quantity).toBe(3);
  });

  it('rejects wrong-signature, expired and malformed-subject tokens on the protected Orders route', async () => {
    const user = await account('jwt');
    const options = { secret: testSecret, issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE, expiresIn: 3600 };
    const tokens = [
      signer.sign({ sub: user.id }, { ...options, secret: 'wrong-test-only-key-at-least-32-bytes' }),
      signer.sign({ sub: user.id }, { ...options, expiresIn: -60 }),
      signer.sign({ sub: 'not-a-uuid' }, options),
    ];
    for (const token of tokens) {
      await request(app.getHttpServer()).post('/api/orders')
        .set('Authorization', `Bearer ${token}`).send({}).expect(401);
    }
    expect(await prisma.order.count({ where: { userId: user.id } })).toBe(0);
  });

  it('does not accept a token after its account has been deleted', async () => {
    const user = await account('deleted');
    await prisma.user.delete({ where: { id: user.id } });
    await request(app.getHttpServer()).get('/api/auth/me')
      .set('Authorization', `Bearer ${user.token}`).expect(401);
  });
});
