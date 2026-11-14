import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import type { ProductDetailDto, ProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  findAll(): Promise<ProductDto[]> {
    return this.products.findAll();
  }

  @Get(':id/availability')
  availability(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('sizeId') sizeId: string,
    @Query('toppingIds') rawToppingIds?: string,
  ) {
    const toppingIds = rawToppingIds ? rawToppingIds.split(',') : [];
    return this.products.availability(id, sizeId, toppingIds);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductDetailDto> {
    return this.products.findOne(id);
  }
}
