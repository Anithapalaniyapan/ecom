import { IsString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 2, description: 'Quantity to add to cart', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'M', description: 'Selected size' })
  @IsOptional()
  @IsString()
  selectedSize?: string;

  @ApiPropertyOptional({ example: 'Red', description: 'Selected color' })
  @IsOptional()
  @IsString()
  selectedColor?: string;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 3, description: 'New quantity', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'L', description: 'Updated size' })
  @IsOptional()
  @IsString()
  selectedSize?: string;

  @ApiPropertyOptional({ example: 'Blue', description: 'Updated color' })
  @IsOptional()
  @IsString()
  selectedColor?: string;
}
