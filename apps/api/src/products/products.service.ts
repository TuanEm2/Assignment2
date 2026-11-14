import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ProductDetailDto, ProductDto } from './dto/product.dto';
import { calculateAvailableCups } from './availability';

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

  async findAll(): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany({
      select: {
        ...productFields,
        sizes: {
          where: { name: 'S' },
          select: { recipe: { select: { ingredientId: true, quantity: true } } },
        },
      },
      orderBy: { slug: 'asc' },
    });
    const ingredientIds = [...new Set(products.flatMap((product) =>
      (product.sizes?.[0]?.recipe ?? []).map((row) => row.ingredientId),
    ))];
    if (!ingredientIds.length) {
      return products.map(({ sizes: _sizes, ...product }) => product);
    }
    const stocks = await this.prisma.ingredient.findMany({
      where: { id: { in: ingredientIds } },
      select: { id: true, stock: true },
    });
    return products.map(({ sizes, ...product }) => ({
      ...product,
      availableCups: sizes?.[0]?.recipe?.length
        ? calculateAvailableCups(sizes[0].recipe, stocks)
        : null,
    }));
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
  /** Estimate from the same size/topping ingredient recipes used by reservation. */
  async availability(productId: string, sizeId: string, toppingIds: string[]) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuid.test(sizeId) || toppingIds.some((id) => !uuid.test(id)) ||
        new Set(toppingIds).size !== toppingIds.length) {
      throw new BadRequestException('Invalid size or topping selection');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        sizes: { select: { id: true, recipe: { select: { ingredientId: true, quantity: true } } } },
        toppings: { select: { id: true, recipe: { select: { ingredientId: true, quantity: true } } } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    const size = product.sizes.find((option) => option.id === sizeId);
    if (!size) throw new BadRequestException('Size does not belong to product');
    if (!size.recipe.length) throw new ServiceUnavailableException('Size recipe is not configured');

    const recipe = [...size.recipe];
    for (const id of toppingIds) {
      const topping = product.toppings.find((option) => option.id === id);
      if (!topping) throw new BadRequestException('Topping does not belong to product');
      if (!topping.recipe.length) throw new ServiceUnavailableException('Topping recipe is not configured');
      recipe.push(...topping.recipe);
    }
    const ingredientIds = [...new Set(recipe.map((row) => row.ingredientId))];
    const ingredients = await this.prisma.ingredient.findMany({
      where: { id: { in: ingredientIds } },
      select: { id: true, stock: true },
    });
    return { productId, sizeId, toppingIds, availableCups: calculateAvailableCups(recipe, ingredients) };
  }
}
