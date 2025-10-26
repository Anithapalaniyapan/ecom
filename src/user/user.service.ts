import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { User, UserRole } from './user.entity';
import { CreateUserDto, UpdateUserDto, LoginDto, ChangePasswordDto, SellerVerificationDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<{ user: User; token: string }> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate seller-specific fields
    if (createUserDto.role === UserRole.SELLER) {
      if (!createUserDto.businessName) {
        throw new BadRequestException('Business name is required for sellers');
      }
      if (!createUserDto.phoneNumber) {
        throw new BadRequestException('Phone number is required for sellers');
      }
      // Address details are optional during signup; sellers can complete them later in profile
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);
    
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    const token = this.jwtService.sign({ 
      sub: savedUser.id, 
      email: savedUser.email,
      role: savedUser.role 
    });

    return { user: savedUser, token };
  }

  async login(loginDto: LoginDto): Promise<{ user: User; token: string }> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const token = this.jwtService.sign({ 
      sub: user.id, 
      email: user.email,
      role: user.role 
    });

    return { user, token };
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['orders', 'reviews', 'wishlists'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.findById(id);
    
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 12);
    user.password = hashedNewPassword;
    
    await this.userRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: ['orders', 'reviews'],
    });
  }

  async findByRole(role: UserRole): Promise<User[]> {
    return this.userRepository.find({
      where: { role },
      select: [
        'id', 'email', 'firstName', 'lastName', 'phoneNumber', 'address', 
        'city', 'state', 'zipCode', 'country', 'role', 'isActive', 
        'emailVerified', 'businessName', 'businessDescription', 
        'businessLicense', 'taxId', 'isVerifiedSeller', 'createdAt', 'updatedAt'
      ],
    });
  }

  async verifySeller(id: string, sellerVerificationDto: SellerVerificationDto): Promise<User> {
    const user = await this.findById(id);
    
    if (user.role !== UserRole.SELLER) {
      throw new BadRequestException('User is not a seller');
    }

    user.isVerifiedSeller = sellerVerificationDto.isVerifiedSeller;
    return this.userRepository.save(user);
  }

  async getSellerStats(sellerId: string): Promise<any> {
    const seller = await this.findById(sellerId);
    
    if (seller.role !== UserRole.SELLER) {
      throw new BadRequestException('User is not a seller');
    }

    // This would typically include product counts, order stats, etc.
    // For now, returning basic seller info
    return {
      seller: {
        id: seller.id,
        businessName: seller.businessName,
        isVerifiedSeller: seller.isVerifiedSeller,
        createdAt: seller.createdAt,
      },
      stats: {
        totalProducts: 0, // Would be calculated from products table
        totalOrders: 0,    // Would be calculated from orders table
        totalRevenue: 0,   // Would be calculated from orders table
      }
    };
  }

  async uploadProfilePicture(userId: string, file: Express.Multer.File): Promise<User> {
    const user = await this.findById(userId);

    // Create uploads/profile-pictures directory if it doesn't exist
    const uploadPath = path.join(process.cwd(), 'uploads', 'profile-pictures');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `${userId}-${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadPath, fileName);

    // Delete old profile picture if exists
    if (user.profilePicture) {
      // Handle both old format (uploads/profile-pictures/file.jpg) and new format (profile-pictures/file.jpg)
      const oldPath = user.profilePicture.startsWith('uploads/')
        ? user.profilePicture
        : `uploads/${user.profilePicture}`;
      const oldFilePath = path.join(process.cwd(), oldPath);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (error) {
          // Log error but don't fail the upload if old file deletion fails
          console.error('Error deleting old profile picture:', error);
        }
      }
    }

    // Save the file
    fs.writeFileSync(filePath, file.buffer);

    // Store path relative to uploads directory (this will be accessible at /uploads/profile-pictures/filename)
    const relativePath = `profile-pictures/${fileName}`;
    user.profilePicture = relativePath;
    
    return this.userRepository.save(user);
  }
}
