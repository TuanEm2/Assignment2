import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type { ProductDetailDto, ProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  findAll(): Promise<ProductDto[]> {
    return this.products.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductDetailDto> {
    return this.products.findOne(id);
  }
}
