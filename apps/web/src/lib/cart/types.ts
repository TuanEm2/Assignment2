/** Giá VND được biểu diễn bằng số nguyên. Tổng tiền phía client chỉ dùng để hiển thị. */
export type MoneyVND = number;

export interface CartOption {
  id: string;
  name: string;
  price: MoneyVND;
}

export interface CartLine {
  /** Khóa phân biệt sản phẩm + size + danh sách topping. */
  id: string;
  productId: string;
  productName: string;
  basePrice: MoneyVND;
  size: CartOption | null;
  toppings: CartOption[];
  quantity: number;
  imageUrl?: string;
}

export type AddCartLineInput = Omit<CartLine, 'id' | 'quantity' | 'toppings' | 'size'> & {
  quantity?: number;
  size?: CartOption | null;
  toppings?: CartOption[];
};
