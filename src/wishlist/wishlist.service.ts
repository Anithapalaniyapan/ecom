import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from './wishlist.entity';
import { AddToWishlistDto } from './dto/wishlist.dto';
import { ProductService } from '../product/product.service';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private wishlistRepository: Repository<Wishlist>,
    private productService: ProductService,
  ) {}

  async addToWishlist(userId: string, addToWishlistDto: AddToWishlistDto): Promise<Wishlist> {
    const { productId } = addToWishlistDto;

    // Check if product exists
    await this.productService.findById(productId);

    // Check if already in wishlist
    const existingWishlistItem = await this.wishlistRepository.findOne({
      where: { userId, productId },
    });

    if (existingWishlistItem) {
      throw new ConflictException('Product is already in your wishlist');
    }

    const wishlistItem = this.wishlistRepository.create({
      userId,
      productId,
    });

    return this.wishlistRepository.save(wishlistItem);
  }

  async getWishlistItems(userId: string): Promise<Wishlist[]> {
    return this.wishlistRepository.find({
      where: { userId },
      relations: ['product', 'product.category'],
      order: { createdAt: 'DESC' },
    });
  }

  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    const wishlistItem = await this.wishlistRepository.findOne({
      where: { userId, productId },
    });

    if (!wishlistItem) {
      throw new NotFoundException('Product not found in wishlist');
    }

    await this.wishlistRepository.remove(wishlistItem);
  }

  async clearWishlist(userId: string): Promise<void> {
    await this.wishlistRepository.delete({ userId });
  }

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const wishlistItem = await this.wishlistRepository.findOne({
      where: { userId, productId },
    });

    return !!wishlistItem;
  }

  async getWishlistCount(userId: string): Promise<number> {
    return this.wishlistRepository.count({ where: { userId } });
  }
}
