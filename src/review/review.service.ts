import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review, ReviewStatus } from './review.entity';
import { CreateReviewDto, UpdateReviewDto, ReviewFilterDto, HelpfulReviewDto } from './dto/review.dto';
import { ProductService } from '../product/product.service';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    private productService: ProductService,
  ) {}

  async create(userId: string, createReviewDto: CreateReviewDto): Promise<Review> {
    const { productId } = createReviewDto;

    // Check if product exists
    await this.productService.findById(productId);

    // Check if user has already reviewed this product
    const existingReview = await this.reviewRepository.findOne({
      where: { userId, productId },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    const review = this.reviewRepository.create({
      ...createReviewDto,
      userId,
    });

    const savedReview = await this.reviewRepository.save(review);
    
    // Update product rating
    await this.productService.updateRating(productId);

    return savedReview;
  }

  async findAll(filterDto: ReviewFilterDto = {}): Promise<{ reviews: Review[]; total: number }> {
    const {
      rating,
      status,
      isVerified,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 20,
    } = filterDto;

    const queryBuilder = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.product', 'product')
      .where('review.status = :status', { status: ReviewStatus.APPROVED });

    // Rating filter
    if (rating !== undefined) {
      queryBuilder.andWhere('review.rating = :rating', { rating });
    }

    // Status filter
    if (status !== undefined) {
      queryBuilder.andWhere('review.status = :status', { status });
    }

    // Verified filter
    if (isVerified !== undefined) {
      queryBuilder.andWhere('review.isVerified = :isVerified', { isVerified });
    }

    // Sorting
    queryBuilder.orderBy(`review.${sortBy}`, sortOrder);

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [reviews, total] = await queryBuilder.getManyAndCount();

    return { reviews, total };
  }

  async findByProduct(productId: string, filterDto: ReviewFilterDto = {}): Promise<{ reviews: Review[]; total: number; averageRating: number }> {
    const {
      rating,
      isVerified,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 20,
    } = filterDto;

    const queryBuilder = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .where('review.productId = :productId', { productId })
      .andWhere('review.status = :status', { status: ReviewStatus.APPROVED });

    // Rating filter
    if (rating !== undefined) {
      queryBuilder.andWhere('review.rating = :rating', { rating });
    }

    // Verified filter
    if (isVerified !== undefined) {
      queryBuilder.andWhere('review.isVerified = :isVerified', { isVerified });
    }

    // Sorting
    queryBuilder.orderBy(`review.${sortBy}`, sortOrder);

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [reviews, total] = await queryBuilder.getManyAndCount();

    // Calculate average rating
    const averageRatingResult = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .where('review.productId = :productId', { productId })
      .andWhere('review.status = :status', { status: ReviewStatus.APPROVED })
      .getRawOne();

    const averageRating = parseFloat(averageRatingResult.average) || 0;

    return { reviews, total, averageRating };
  }

  async findById(id: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ['user', 'product'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async findByUser(userId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { userId },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, userId: string, updateReviewDto: UpdateReviewDto): Promise<Review> {
    const review = await this.findById(id);

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    Object.assign(review, updateReviewDto);
    const savedReview = await this.reviewRepository.save(review);

    // Update product rating
    await this.productService.updateRating(review.productId);

    return savedReview;
  }

  async delete(id: string, userId: string): Promise<void> {
    const review = await this.findById(id);

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.reviewRepository.remove(review);

    // Update product rating
    await this.productService.updateRating(review.productId);
  }

  async markHelpful(id: string, helpfulDto: HelpfulReviewDto): Promise<Review> {
    const review = await this.findById(id);

    if (helpfulDto.isHelpful) {
      review.helpfulCount += 1;
    } else {
      review.notHelpfulCount += 1;
    }

    return this.reviewRepository.save(review);
  }

  async getReviewStats(productId: string): Promise<{
    totalReviews: number;
    averageRating: number;
    ratingDistribution: { [key: number]: number };
  }> {
    const reviews = await this.reviewRepository.find({
      where: { productId, status: ReviewStatus.APPROVED },
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
      : 0;

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      ratingDistribution[review.rating]++;
    });

    return {
      totalReviews,
      averageRating,
      ratingDistribution,
    };
  }

  async approveReview(id: string): Promise<Review> {
    const review = await this.findById(id);
    review.status = ReviewStatus.APPROVED;
    return this.reviewRepository.save(review);
  }

  async rejectReview(id: string): Promise<Review> {
    const review = await this.findById(id);
    review.status = ReviewStatus.REJECTED;
    return this.reviewRepository.save(review);
  }
}
