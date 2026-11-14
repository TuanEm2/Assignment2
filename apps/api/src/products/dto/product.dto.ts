export interface ProductDto {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string;
  /** Approximate number of size S drinks without toppings. */
  availableCups?: number | null;
}

interface ProductOptionDto {
  id: string;
  name: string;
  price: number;
}

export interface ProductDetailDto extends ProductDto {
  sizes: (ProductOptionDto & { name: 'S' | 'M' | 'L' })[];
  toppings: ProductOptionDto[];
}
