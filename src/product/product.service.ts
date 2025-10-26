import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
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

  async create(createProductDto: CreateProductDto, files?: Express.Multer.File[], sellerId?: string): Promise<Product> {
    const images: string[] = [];

    // Save uploaded images if provided
    if (files && files.length > 0) {
      const uploadPath = path.join(process.cwd(), 'uploads', 'products');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      for (const file of files) {
        const extension = path.extname(file.originalname);
        const safeBase = path.basename(file.originalname, extension).replace(/[^a-zA-Z0-9-_]/g, '');
        const fileName = `${safeBase}-${Date.now()}${extension}`;
        const filePath = path.join(uploadPath, fileName);
        fs.writeFileSync(filePath, file.buffer);
        images.push(`products/${fileName}`); // relative to /uploads
      }
    }

    const mergedDto: CreateProductDto & { sellerId?: string } = {
      ...createProductDto,
      images: [...(createProductDto.images || []), ...images],
      // sellerId will be assigned on entity below
    };

    const product = this.productRepository.create(mergedDto as any) as unknown as Product;
    if (sellerId) {
      (product as any).sellerId = sellerId;
    }
    const saved = await this.productRepository.save(product as any);
    return saved as Product;
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

  async findBySeller(sellerId: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { sellerId, isActive: true },
      relations: ['category'],
      order: { createdAt: 'DESC' },
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
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    // Soft-delete to avoid FK constraint issues with carts, wishlists, orders, reviews
    product.isActive = false;
    await this.productRepository.save(product);

    // Optionally remove image files from disk (kept safe even if missing)
    if (product.images && product.images.length > 0) {
      const base = path.join(process.cwd(), 'uploads');
      for (const rel of product.images) {
        const fp = path.join(base, rel);
        if (fs.existsSync(fp)) {
          try { fs.unlinkSync(fp); } catch {}
        }
      }
      product.images = [] as any;
      await this.productRepository.save(product);
    }
  }

  async deleteBySeller(sellerId: string): Promise<void> {
    // Soft-delete all products owned by seller
    await this.productRepository.update({ sellerId } as any, { isActive: false } as any);
  }

  async deleteAll(): Promise<void> {
    // Admin: soft-delete all
    await this.productRepository.update({} as any, { isActive: false } as any);
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
