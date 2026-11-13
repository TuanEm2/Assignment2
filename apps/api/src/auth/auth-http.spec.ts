import { Module, type INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { configureHttp } from '../http/app-http.config';
import { TOKEN_AUDIENCE, TOKEN_ISSUER } from './access-tokens';
import { AuthUsers, EmailAlreadyExists, type StoredAuthUser } from './auth-users';
import { AuthModule } from './auth.module';

class FixtureUsers extends AuthUsers {
  readonly rows = new Map<string, StoredAuthUser>();
  async findByEmail(email: string) {
    return [...this.rows.values()].find(user => user.email === email) ?? null;
  }
  async findById(id: string) { return this.rows.get(id) ?? null; }
  async create(input: { email: string; passwordHash: string; name?: string }) {
    if ([...this.rows.values()].some(user => user.email === input.email)) throw new EmailAlreadyExists();
    const user = { id: randomUUID(), ...input };
    this.rows.set(user.id, user);
    return user;
  }
}

const users = new FixtureUsers();
@Module({ providers: [{ provide: AuthUsers, useValue: users }], exports: [AuthUsers] })
class FixtureUsersModule {}

describe('TV5 first-push Auth HTTP — real JWT/hash, fixture persistence', () => {
  let app: INestApplication;
  let tokenA: string;
  let userA: StoredAuthUser;
  const originalSecret = process.env.JWT_SECRET;
  const secret = 'tv5-test-only-signing-key-at-least-32-bytes';
  const password = 'Coffee-Only-For-Tests-42';
  const signer = new JwtService();
  const signed = (payload: object, options: Record<string, unknown> = {}) => signer.sign(payload, {
    secret, issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE, expiresIn: 3600, ...options,
  });

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    const module = await Test.createTestingModule({ imports: [
      AuthModule.withUsers(FixtureUsersModule),
    ] }).compile();
    app = module.createNestApplication({ logger: false });
    configureHttp(app);
    await app.init();
    for (const email of ['a@example.test', 'b@example.test']) {
      await request(app.getHttpServer()).post('/api/auth/register').send({ email, password }).expect(201);
    }
    userA = (await users.findByEmail('a@example.test'))!;
    tokenA = (await request(app.getHttpServer()).post('/api/auth/login').send({ email: userA.email, password }).expect(200)).body.accessToken;
  });

  afterEach(() => { jest.restoreAllMocks(); });
  afterAll(async () => {
    await app?.close();
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  it('normalizes email, stores a salted hash and exposes only public user fields', async () => {
    const response = await request(app.getHttpServer()).post('/api/auth/register')
      .send({ email: '  NEW@Example.Test ', password }).expect(201);
    expect(response.body).toEqual({ user: { id: expect.any(String), email: 'new@example.test' } });
    const stored = (await users.findByEmail('new@example.test'))!;
    expect(stored.passwordHash).toMatch(/^scrypt\$/);
    expect(stored.passwordHash).not.toContain(password);
    expect(stored.passwordHash).not.toBe(userA.passwordHash);
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'NEW@example.test', password }).expect(200);
  });

  it.each([
    {}, [], { email: 'bad', password }, { email: 'ok@example.test', password: 1 },
    { email: 'ok@example.test', password: 'short' },
    { email: 'ok@example.test', password: 'x'.repeat(129) },
    { email: 'ok@example.test', password, role: 'ADMIN' },
  ])('rejects invalid/mass-assignment registration body %# before persisting', async body => {
    const count = users.rows.size;
    await request(app.getHttpServer()).post('/api/auth/register').send(body).expect(400);
    expect(users.rows.size).toBe(count);
  });

  it('concurrent duplicate registrations create exactly one account under the unique-email contract', async () => {
    const email = 'race@example.test';
    const responses = await Promise.all([1, 2].map(() => request(app.getHttpServer())
      .post('/api/auth/register').send({ email, password })));
    expect(responses.map(r => r.status).sort((a, b) => a - b)).toEqual([201, 409]);
    expect([...users.rows.values()].filter(user => user.email === email)).toHaveLength(1);
  });

  it('returns a verifiable expiring JWT without password or email in its claims', async () => {
    const response = await request(app.getHttpServer()).post('/api/auth/login')
      .send({ email: userA.email, password }).expect(200);
    expect(response.body).toEqual({ accessToken: expect.any(String), tokenType: 'Bearer', expiresIn: 3600,
      user: { id: userA.id, email: userA.email } });
    const claims = signer.verify(response.body.accessToken, { secret, issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE, algorithms: ['HS256'] });
    expect(claims.sub).toBe(userA.id);
    expect(claims.exp - claims.iat).toBe(3600);
    expect(Object.keys(claims).sort()).toEqual(['aud', 'exp', 'iat', 'iss', 'sub']);
  });

  it('wrong password and unknown email return the same generic login failure', async () => {
    const wrong = await request(app.getHttpServer()).post('/api/auth/login')
      .send({ email: userA.email, password: 'wrong-password-value' }).expect(401);
    const unknown = await request(app.getHttpServer()).post('/api/auth/login')
      .send({ email: 'nobody@example.test', password }).expect(401);
    expect(wrong.body.message).toBe(unknown.body.message);
    expect(wrong.body).not.toHaveProperty('accessToken');
  });

  it('preserves password whitespace rather than silently trimming it', async () => {
    const email = 'spaces@example.test'; const exact = '  Coffee-Space-42  ';
    await request(app.getHttpServer()).post('/api/auth/register').send({ email, password: exact }).expect(201);
    await request(app.getHttpServer()).post('/api/auth/login').send({ email, password: exact.trim() }).expect(401);
    await request(app.getHttpServer()).post('/api/auth/login').send({ email, password: exact }).expect(200);
  });

  it('reads current account through the real guard without sensitive fields', async () => {
    const response = await request(app.getHttpServer()).get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(response.body).toEqual({ user: { id: userA.id, email: userA.email } });
  });

  it.each(['', 'Basic abc', 'Bearer junk'])('rejects malformed/missing authorization: %s', async header => {
    const read = jest.spyOn(users, 'findById');
    await request(app.getHttpServer()).get('/api/auth/me').set('Authorization', header).expect(401);
    expect(read).not.toHaveBeenCalled();
  });

  it.each([
    ['wrong signature', () => signed({ sub: userA.id }, { secret: 'another-test-key-at-least-32-bytes' })],
    ['expired', () => signed({ sub: userA.id }, { expiresIn: -60 })],
    ['wrong issuer', () => signed({ sub: userA.id }, { issuer: 'other-app' })],
    ['wrong audience', () => signed({ sub: userA.id }, { audience: 'other-client' })],
    ['wrong algorithm', () => signed({ sub: userA.id }, { algorithm: 'HS384' })],
    ['missing subject', () => signed({})],
    ['missing expiration', () => signer.sign({ sub: userA.id }, { secret, issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE })],
  ])('rejects %s JWT before reading orders', async (_label, makeToken) => {
    const read = jest.spyOn(users, 'findById');
    await request(app.getHttpServer()).get('/api/auth/me')
      .set('Authorization', `Bearer ${makeToken()}`).expect(401);
    expect(read).not.toHaveBeenCalled();
  });

  it('rejects a token whose signed account no longer exists', async () => {
    const deletedId = randomUUID();
    await request(app.getHttpServer()).get('/api/auth/me')
      .set('Authorization', `Bearer ${signed({ sub: deletedId })}`).expect(401);
  });

  it('never accepts a query-string token instead of the Authorization header', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').query({ token: tokenA }).expect(401);
  });


  it('accepts the optional name sent by TV6 and never accepts a client role', async () => {
    const email = 'named@example.test';
    const response = await request(app.getHttpServer()).post('/api/auth/register')
      .send({ email, password, name: '  TV5 Test  ' }).expect(201);
    expect(response.body.user.name).toBe('TV5 Test');
    await request(app.getHttpServer()).post('/api/auth/register')
      .send({ email: 'bad-role@example.test', password, role: 'ADMIN' }).expect(400);
  });

  it('rejects a correctly signed non-UUID subject before calling persistence', async () => {
    const read = jest.spyOn(users, 'findById');
    await request(app.getHttpServer()).get('/api/auth/me')
      .set('Authorization', `Bearer ${signed({ sub: 'not-a-uuid' })}`).expect(401);
    expect(read).not.toHaveBeenCalled();
  });
});
