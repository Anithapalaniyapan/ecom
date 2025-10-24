import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add product to cart' })
  @ApiResponse({ status: 201, description: 'Product added to cart successfully' })
  @ApiResponse({ status: 400, description: 'Product out of stock or insufficient stock' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: AddToCartDto })
  async addToCart(@Request() req, @Body() addToCartDto: AddToCartDto) {
    return this.cartService.addToCart(req.user.id, addToCartDto);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all cart items' })
  @ApiResponse({ status: 200, description: 'Cart items retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCartItems(@Request() req) {
    return this.cartService.getCartItems(req.user.id);
  }

  @Get('total')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get cart total and item count' })
  @ApiResponse({ status: 200, description: 'Cart total retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCartTotal(@Request() req) {
    return this.cartService.getCartTotal(req.user.id);
  }

  @Get('count')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get total number of items in cart' })
  @ApiResponse({ status: 200, description: 'Cart count retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCartItemCount(@Request() req) {
    return this.cartService.getCartItemCount(req.user.id);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update cart item quantity, size, or color' })
  @ApiResponse({ status: 200, description: 'Cart item updated successfully' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: UpdateCartItemDto })
  async updateCartItem(
    @Param('id') id: string,
    @Request() req,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(id, req.user.id, updateCartItemDto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove specific item from cart' })
  @ApiResponse({ status: 200, description: 'Cart item removed successfully' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeCartItem(@Param('id') id: string, @Request() req) {
    return this.cartService.removeCartItem(id, req.user.id);
  }

  @Delete()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.id);
  }
}
