import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './cart.entity';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { ProductService } from '../product/product.service';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    private productService: ProductService,
  ) {}

  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<Cart> {
    const { productId, quantity, selectedSize, selectedColor } = addToCartDto;

    // Check if product exists and is available
    const product = await this.productService.findById(productId);
    
    if (!product.isInStock) {
      throw new BadRequestException('Product is out of stock');
    }

    if (product.stockQuantity < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    // Check if item already exists in cart
    const existingCartItem = await this.cartRepository.findOne({
      where: {
        userId,
        productId,
        selectedSize: selectedSize || undefined,
        selectedColor: selectedColor || undefined,
      },
    });

    if (existingCartItem) {
      existingCartItem.quantity += quantity;
      return this.cartRepository.save(existingCartItem);
    }

    // Create new cart item
    const cartItem = this.cartRepository.create({
      userId,
      productId,
      quantity,
      selectedSize,
      selectedColor,
    });

    return this.cartRepository.save(cartItem);
  }

  async getCartItems(userId: string): Promise<Cart[]> {
    return this.cartRepository.find({
      where: { userId },
      relations: ['product', 'product.category'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateCartItem(cartItemId: string, userId: string, updateCartItemDto: UpdateCartItemDto): Promise<Cart> {
    const cartItem = await this.cartRepository.findOne({
      where: { id: cartItemId, userId },
      relations: ['product'],
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Check stock availability
    if (cartItem.product.stockQuantity < updateCartItemDto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    Object.assign(cartItem, updateCartItemDto);
    return this.cartRepository.save(cartItem);
  }

  async removeCartItem(cartItemId: string, userId: string): Promise<void> {
    const cartItem = await this.cartRepository.findOne({
      where: { id: cartItemId, userId },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartRepository.remove(cartItem);
  }

  async clearCart(userId: string): Promise<void> {
    await this.cartRepository.delete({ userId });
  }

  async getCartTotal(userId: string): Promise<{ subtotal: number; itemCount: number }> {
    const cartItems = await this.getCartItems(userId);
    
    const subtotal = cartItems.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);

    const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

    return { subtotal, itemCount };
  }

  async getCartItemCount(userId: string): Promise<number> {
    const result = await this.cartRepository
      .createQueryBuilder('cart')
      .select('SUM(cart.quantity)', 'total')
      .where('cart.userId = :userId', { userId })
      .getRawOne();

    return parseInt(result.total) || 0;
  }
}
