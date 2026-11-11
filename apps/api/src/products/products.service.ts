import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ProductDetailDto, ProductDto } from './dto/product.dto';

const productFields = {
  id: true,
  slug: true,
  name: true,
  price: true,
  imageUrl: true,
} satisfies Prisma.ProductSelect;

const optionFields = { id: true, name: true, price: true } as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<ProductDto[]> {
    return this.prisma.product.findMany({
      select: productFields,
      orderBy: { slug: 'asc' },
    });
  }

  async findOne(id: string): Promise<ProductDetailDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: {
        ...productFields,
        sizes: { select: optionFields, orderBy: { name: 'asc' } },
        toppings: { select: optionFields, orderBy: { name: 'asc' } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }
}
