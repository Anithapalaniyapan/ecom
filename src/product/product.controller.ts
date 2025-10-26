import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto, ProductFilterDto } from './dto/product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 6))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new product (supports image upload)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({
    description: 'Product fields with optional images[] files',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        originalPrice: { type: 'number' },
        stockQuantity: { type: 'number' },
        sku: { type: 'string' },
        sizes: { type: 'array', items: { type: 'string' } },
        colors: { type: 'array', items: { type: 'string' } },
        tags: { type: 'array', items: { type: 'string' } },
        brand: { type: 'string' },
        weight: { type: 'string' },
        dimensions: { type: 'string' },
        material: { type: 'string' },
        careInstructions: { type: 'string' },
        categoryId: { type: 'string', format: 'uuid' },
        images: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
      required: ['name', 'price', 'stockQuantity', 'categoryId'],
    },
  })
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() images: Express.Multer.File[] | undefined,
    @Request() req: any,
  ) {
    // Allow only sellers
    if (!req?.user || req.user.role !== 'seller') {
      throw new ForbiddenException('Only sellers can create products');
    }
    // Validate file types if provided
    if (images && images.length > 0) {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
      const invalid = images.find((f) => !allowed.includes(f.mimetype));
      if (invalid) {
        throw new BadRequestException('Invalid image type. Only JPEG, JPG, PNG allowed.');
      }
    }

    return this.productService.create(createProductDto, images, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with advanced filtering' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for products' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category ID' })
  @ApiQuery({ name: 'brand', required: false, description: 'Filter by brand' })
  @ApiQuery({ name: 'minPrice', required: false, description: 'Minimum price filter' })
  @ApiQuery({ name: 'maxPrice', required: false, description: 'Maximum price filter' })
  @ApiQuery({ name: 'size', required: false, description: 'Filter by size' })
  @ApiQuery({ name: 'color', required: false, description: 'Filter by color' })
  @ApiQuery({ name: 'minRating', required: false, description: 'Minimum rating filter' })
  @ApiQuery({ name: 'isFeatured', required: false, description: 'Filter featured products' })
  @ApiQuery({ name: 'isNew', required: false, description: 'Filter new products' })
  @ApiQuery({ name: 'isOnSale', required: false, description: 'Filter products on sale' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (ASC/DESC)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async findAll(@Query() filterDto: ProductFilterDto) {
    return this.productService.findAll(filterDto);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured products' })
  @ApiResponse({ status: 200, description: 'Featured products retrieved successfully' })
  async findFeatured() {
    return this.productService.findFeatured();
  }

  @Get('new')
  @ApiOperation({ summary: 'Get new products' })
  @ApiResponse({ status: 200, description: 'New products retrieved successfully' })
  async findNew() {
    return this.productService.findNew();
  }

  @Get('sale')
  @ApiOperation({ summary: 'Get products on sale' })
  @ApiResponse({ status: 200, description: 'Sale products retrieved successfully' })
  async findOnSale() {
    return this.productService.findOnSale();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get products created by current seller' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async findMy(@Request() req: any) {
    if (!req?.user || req.user.role !== 'seller') {
      return [];
    }
    return this.productService.findBySeller(req.user.id);
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Get products by category' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findByCategory(@Param('categoryId') categoryId: string) {
    return this.productService.findByCategory(categoryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string) {
    return this.productService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: UpdateProductDto })
  async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update product stock' })
  @ApiResponse({ status: 200, description: 'Stock updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateStock(@Param('id') id: string, @Body('quantity') quantity: number) {
    return this.productService.updateStock(id, quantity);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete product' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string, @Request() req: any) {
    // Allow sellers to delete their own products; admins can delete any
    if (req?.user?.role === 'seller') {
      const product = await this.productService.findById(id);
      // If product has a sellerId, enforce ownership. If legacy (null sellerId), allow deletion for cleanup
      if (product && (product as any).sellerId && (product as any).sellerId !== req.user.id) {
        throw new BadRequestException('You can only delete your own products');
      }
    }
    return this.productService.delete(id);
  }

  @Delete('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete all products of the current seller' })
  @ApiResponse({ status: 200, description: 'Seller products soft-deleted' })
  async removeMine(@Request() req: any) {
    if (!req?.user || req.user.role !== 'seller') {
      throw new BadRequestException('Only sellers can delete their products');
    }
    await this.productService.deleteBySeller(req.user.id);
    return { success: true };
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete all products (Admin only, soft delete)' })
  async removeAll(@Request() req: any) {
    if (!req?.user || req.user.role !== 'admin') {
      throw new BadRequestException('Only admin can delete all products');
    }
    await this.productService.deleteAll();
    return { success: true };
  }
}
