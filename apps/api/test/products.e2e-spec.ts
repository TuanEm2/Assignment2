import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/http/app-http.config';
import { PrismaService } from '../src/prisma/prisma.service';

const product = {
  id: '07442aa4-135f-4e17-b3f2-d935984b5633',
  slug: 'americano',
  name: 'Americano',
  price: 40000,
  imageUrl: '/images/products/americano.jpg',
};

const detail = {
  ...product,
  sizes: [
    { id: 'be72cb31-ea09-40ea-b37a-039b4f8081f5', name: 'M', price: 5000 },
  ],
  toppings: [
    { id: '32bfcc03-659a-4aa3-9300-861664b5fc7e', name: 'Kem', price: 10000 },
  ],
};

describe('Products API (e2e)', () => {
  const findMany = jest.fn();
  const findUnique = jest.fn();
  let app: INestApplication<App>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ product: { findMany, findUnique } })
      .compile();

    app = module.createNestApplication();
    configureHttp(app);
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('serves the catalog at the public API prefix', async () => {
    findMany.mockResolvedValue([product]);

    await request(app.getHttpServer())
      .get('/api/products')
      .expect(200, [product]);
    await request(app.getHttpServer()).get('/products').expect(404);
  });

  it('returns an empty JSON array for an empty catalog', async () => {
    findMany.mockResolvedValue([]);
    await request(app.getHttpServer()).get('/api/products').expect(200, []);
  });

  it('serves a product with size and topping options', async () => {
    findUnique.mockResolvedValue(detail);

    await request(app.getHttpServer())
      .get(`/api/products/${product.id}`)
      .expect(200, detail);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: product.id } }),
    );
  });

  it('rejects a malformed UUID before querying Prisma', async () => {
    await request(app.getHttpServer())
      .get('/api/products/not-a-uuid')
      .expect(400);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown UUID', async () => {
    findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get(`/api/products/${product.id}`)
      .expect(404, {
        statusCode: 404,
        message: 'Product not found',
        error: 'Not Found',
      });
  });
});
