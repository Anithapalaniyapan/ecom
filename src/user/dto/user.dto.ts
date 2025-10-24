import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../user.entity';
import { IsRequiredForRole, IsOptionalForRole } from '../decorators/role-based-validation.decorator';

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password (min 6 characters)', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John', description: 'User first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'User phone number (required for sellers)' })
  @IsRequiredForRole(UserRole.SELLER)
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '123 Main St', description: 'User address (required for sellers)' })
  @IsRequiredForRole(UserRole.SELLER)
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'New York', description: 'User city (required for sellers)' })
  @IsRequiredForRole(UserRole.SELLER)
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'NY', description: 'User state (required for sellers)' })
  @IsRequiredForRole(UserRole.SELLER)
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '10001', description: 'User zip code (required for sellers)' })
  @IsRequiredForRole(UserRole.SELLER)
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ example: 'USA', description: 'User country (required for sellers)' })
  @IsRequiredForRole(UserRole.SELLER)
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ 
    enum: UserRole, 
    example: UserRole.CUSTOMER, 
    description: 'User role - customer (buyer) or seller (vendor)',
    enumName: 'UserRole'
  })
  @IsEnum(UserRole)
  role: UserRole;

  // Seller-specific fields
  @ApiPropertyOptional({ example: 'Fashion Store Inc.', description: 'Business name (required for sellers)' })
  @IsRequiredForRole(UserRole.SELLER)
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ example: 'We sell premium fashion items', description: 'Business description (for sellers)' })
  @IsOptionalForRole(UserRole.SELLER)
  @IsOptional()
  @IsString()
  businessDescription?: string;

  @ApiPropertyOptional({ example: 'BL123456789', description: 'Business license number (for sellers)' })
  @IsOptionalForRole(UserRole.SELLER)
  @IsOptional()
  @IsString()
  businessLicense?: string;

  @ApiPropertyOptional({ example: 'TAX123456789', description: 'Tax ID (for sellers)' })
  @IsOptionalForRole(UserRole.SELLER)
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the seller is verified (for sellers)' })
  @IsOptionalForRole(UserRole.SELLER)
  @IsOptional()
  @IsBoolean()
  isVerifiedSeller?: boolean;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John', description: 'User first name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'User last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'User phone number' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '123 Main St', description: 'User address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'New York', description: 'User city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'NY', description: 'User state' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '10001', description: 'User zip code' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ example: 'USA', description: 'User country' })
  @IsOptional()
  @IsString()
  country?: string;

  // Seller-specific fields
  @ApiPropertyOptional({ example: 'Fashion Store Inc.', description: 'Business name' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ example: 'We sell premium fashion items', description: 'Business description' })
  @IsOptional()
  @IsString()
  businessDescription?: string;

  @ApiPropertyOptional({ example: 'BL123456789', description: 'Business license number' })
  @IsOptional()
  @IsString()
  businessLicense?: string;

  @ApiPropertyOptional({ example: 'TAX123456789', description: 'Tax ID' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the seller is verified' })
  @IsOptional()
  @IsBoolean()
  isVerifiedSeller?: boolean;
}

export class LoginDto {
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPassword123', description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'newPassword123', description: 'New password (min 6 characters)', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class SellerVerificationDto {
  @ApiProperty({ example: true, description: 'Whether to verify the seller' })
  @IsBoolean()
  isVerifiedSeller: boolean;
}
