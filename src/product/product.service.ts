import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, In } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto, UpdateProductDto, ProductFilterDto } from './dto/product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create(createProductDto);
    return this.productRepository.save(product);
  }

  async findAll(filterDto: ProductFilterDto = {}): Promise<{ products: Product[]; total: number }> {
    const {
      search,
      categoryId,
      brand,
      minPrice,
      maxPrice,
      size,
      color,
      minRating,
      isFeatured,
      isNew,
      isOnSale,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 20,
    } = filterDto;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.reviews', 'reviews')
      .where('product.isActive = :isActive', { isActive: true });

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search OR product.brand ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Category filter
    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    // Brand filter
    if (brand) {
      queryBuilder.andWhere('product.brand = :brand', { brand });
    }

    // Price range filter
    if (minPrice !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    // Size filter
    if (size) {
      queryBuilder.andWhere('product.sizes LIKE :size', { size: `%${size}%` });
    }

    // Color filter
    if (color) {
      queryBuilder.andWhere('product.colors LIKE :color', { color: `%${color}%` });
    }

    // Rating filter
    if (minRating !== undefined) {
      queryBuilder.andWhere('product.rating >= :minRating', { minRating });
    }

    // Featured filter
    if (isFeatured !== undefined) {
      queryBuilder.andWhere('product.isFeatured = :isFeatured', { isFeatured });
    }

    // New filter
    if (isNew !== undefined) {
      queryBuilder.andWhere('product.isNew = :isNew', { isNew });
    }

    // Sale filter
    if (isOnSale !== undefined) {
      queryBuilder.andWhere('product.isOnSale = :isOnSale', { isOnSale });
    }

    // Sorting
    queryBuilder.orderBy(`product.${sortBy}`, sortOrder);

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    return { products, total };
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'reviews', 'reviews.user'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Increment view count
    product.viewCount += 1;
    await this.productRepository.save(product);

    return product;
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { categoryId, isActive: true },
      relations: ['category'],
    });
  }

  async findFeatured(): Promise<Product[]> {
    return this.productRepository.find({
      where: { isFeatured: true, isActive: true },
      relations: ['category'],
      take: 10,
    });
  }

  async findNew(): Promise<Product[]> {
    return this.productRepository.find({
      where: { isNew: true, isActive: true },
      relations: ['category'],
      take: 10,
    });
  }

  async findOnSale(): Promise<Product[]> {
    return this.productRepository.find({
      where: { isOnSale: true, isActive: true },
      relations: ['category'],
      take: 10,
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(id);
    
    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  async updateStock(id: string, quantity: number): Promise<Product> {
    const product = await this.findById(id);
    
    if (product.stockQuantity < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    product.stockQuantity -= quantity;
    product.salesCount += quantity;

    if (product.stockQuantity === 0) {
      product.status = 'out_of_stock' as any;
    }

    return this.productRepository.save(product);
  }

  async delete(id: string): Promise<void> {
    const product = await this.findById(id);
    await this.productRepository.remove(product);
  }

  async updateRating(id: string): Promise<void> {
    const product = await this.findById(id);
    
    const reviews = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.reviews', 'reviews')
      .where('product.id = :id', { id })
      .getOne();

    if (reviews && reviews.reviews && reviews.reviews.length > 0) {
      const totalRating = reviews.reviews.reduce((sum, review) => sum + review.rating, 0);
      product.rating = totalRating / reviews.reviews.length;
      product.reviewCount = reviews.reviews.length;
    } else {
      product.rating = 0;
      product.reviewCount = 0;
    }

    await this.productRepository.save(product);
  }
}
