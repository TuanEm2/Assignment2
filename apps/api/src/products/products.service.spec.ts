import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import type { ProductDetailDto, ProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const findMany = jest.fn<() => Promise<ProductDto[]>>();
  const findUnique = jest.fn<() => Promise<ProductDetailDto | null>>();
  let service: ProductsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: { product: { findMany, findUnique } },
        },
      ],
    }).compile();
    service = module.get(ProductsService);
  });

  it('returns an empty list when the catalog is empty', async () => {
    findMany.mockResolvedValue([]);
    await expect(service.findAll()).resolves.toEqual([]);
  });

  it('does not translate a database failure into a missing product', async () => {
    const error = new Error('database unavailable');
    findUnique.mockRejectedValue(error);

    await expect(
      service.findOne('07442aa4-135f-4e17-b3f2-d935984b5633'),
    ).rejects.toBe(error);
  });

  it('reports a missing product when Prisma returns no row', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      service.findOne('07442aa4-135f-4e17-b3f2-d935984b5633'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
