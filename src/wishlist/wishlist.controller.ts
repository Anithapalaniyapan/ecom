import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/wishlist.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post('add')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add product to wishlist' })
  @ApiResponse({ status: 201, description: 'Product added to wishlist successfully' })
  @ApiResponse({ status: 409, description: 'Product is already in wishlist' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: AddToWishlistDto })
  async addToWishlist(@Request() req, @Body() addToWishlistDto: AddToWishlistDto) {
    return this.wishlistService.addToWishlist(req.user.id, addToWishlistDto);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all wishlist items' })
  @ApiResponse({ status: 200, description: 'Wishlist items retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWishlistItems(@Request() req) {
    return this.wishlistService.getWishlistItems(req.user.id);
  }

  @Get('count')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get wishlist item count' })
  @ApiResponse({ status: 200, description: 'Wishlist count retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWishlistCount(@Request() req) {
    return this.wishlistService.getWishlistCount(req.user.id);
  }

  @Get('check/:productId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check if product is in wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist status retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async isInWishlist(@Request() req, @Param('productId') productId: string) {
    return this.wishlistService.isInWishlist(req.user.id, productId);
  }

  @Delete('remove/:productId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  @ApiResponse({ status: 200, description: 'Product removed from wishlist successfully' })
  @ApiResponse({ status: 404, description: 'Product not found in wishlist' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeFromWishlist(@Request() req, @Param('productId') productId: string) {
    return this.wishlistService.removeFromWishlist(req.user.id, productId);
  }

  @Delete()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Clear entire wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist cleared successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async clearWishlist(@Request() req) {
    return this.wishlistService.clearWishlist(req.user.id);
  }
}
