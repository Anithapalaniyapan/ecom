import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CategoryService } from './category/category.service';
import { ProductService } from './product/product.service';
import { UserService } from './user/user.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const categoryService = app.get(CategoryService);
  const productService = app.get(ProductService);
  const userService = app.get(UserService);

  try {
    console.log('Starting database seeding...');

    // Create categories
    const dressCategory = await categoryService.create({
      name: 'Dresses',
      description: 'Elegant and stylish dresses for every occasion',
      type: 'dress' as any,
      imageUrl: 'https://example.com/dress-category.jpg',
    });

    const perfumeCategory = await categoryService.create({
      name: 'Perfumes',
      description: 'Luxurious fragrances for men and women',
      type: 'perfume' as any,
      imageUrl: 'https://example.com/perfume-category.jpg',
    });

    const shoesCategory = await categoryService.create({
      name: 'Shoes',
      description: 'Comfortable and fashionable footwear',
      type: 'shoes' as any,
      imageUrl: 'https://example.com/shoes-category.jpg',
    });

    console.log('Categories created successfully');

    // Create sample products
    const products = [
      // Dresses
      {
        name: 'Elegant Summer Dress',
        description: 'A beautiful summer dress perfect for any occasion',
        price: 49.99,
        originalPrice: 69.99,
        stockQuantity: 50,
        sku: 'DRS-001',
        images: ['https://example.com/dress1.jpg'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Blue', 'Red', 'Black', 'White'],
        tags: ['summer', 'elegant', 'casual'],
        brand: 'Elegance',
        categoryId: dressCategory.id,
        isNew: true,
        isOnSale: true,
      },
      {
        name: 'Floral Maxi Dress',
        description: 'Long flowing dress with beautiful floral pattern',
        price: 89.99,
        stockQuantity: 30,
        sku: 'DRS-002',
        images: ['https://example.com/dress2.jpg'], 
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Pink', 'Purple', 'Green'],
        tags: ['maxi', 'floral', 'formal'],
        brand: 'Floral Dreams',
        categoryId: dressCategory.id,
        isFeatured: true,
      },
      
      // Perfumes
      {
        name: 'Ocean Breeze Fragrance',
        description: 'Fresh and invigorating scent inspired by the ocean',
        price: 65.50,
        stockQuantity: 100,
        sku: 'PRF-001',
        images: ['https://example.com/perfume1.jpg'],
        sizes: ['50ml', '100ml', '150ml'],
        colors: ['Blue'],
        tags: ['fresh', 'ocean', 'unisex'],
        brand: 'Aqua Essence',
        categoryId: perfumeCategory.id,
        isNew: true,
      },
      {
        name: 'Spiced Amber Elixir',
        description: 'Warm and exotic fragrance with amber and spice notes',
        price: 110.00,
        stockQuantity: 75,
        sku: 'PRF-002',
        images: ['https://example.com/perfume2.jpg'],
        sizes: ['50ml', '100ml'],
        colors: ['Amber'],
        tags: ['warm', 'exotic', 'amber'],
        brand: 'Mystic Aura',
        categoryId: perfumeCategory.id,
        isFeatured: true,
      },
      
      // Shoes
      {
        name: 'Classic Leather Sneakers',
        description: 'Timeless design with premium leather construction',
        price: 79.99,
        stockQuantity: 60,
        sku: 'SHO-001',
        images: ['https://example.com/shoes1.jpg'],
        sizes: ['6', '7', '8', '9', '10', '11', '12'],
        colors: ['Black', 'White', 'Brown'],
        tags: ['leather', 'classic', 'casual'],
        brand: 'Timeless',
        categoryId: shoesCategory.id,
        isFeatured: true,
      },
      {
        name: 'Elegant High Heels',
        description: 'Perfect for special occasions and formal events',
        price: 95.00,
        stockQuantity: 40,
        sku: 'SHO-002',
        images: ['https://example.com/shoes2.jpg'],
        sizes: ['6', '7', '8', '9', '10'],
        colors: ['Black', 'Red', 'Nude'],
        tags: ['heels', 'formal', 'elegant'],
        brand: 'Elegance',
        categoryId: shoesCategory.id,
        isOnSale: true,
      },
    ];

    for (const productData of products) {
      await productService.create(productData);
    }

    console.log('Products created successfully');

    // Create admin user
    await userService.create({
      email: 'admin@ecommerce.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin' as any,
    });

    // Create customer users
    await userService.create({
      email: 'customer1@ecommerce.com',
      password: 'customer123',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1234567890',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      role: 'customer' as any,
    });

    await userService.create({
      email: 'customer2@ecommerce.com',
      password: 'customer123',
      firstName: 'Jane',
      lastName: 'Smith',
      phoneNumber: '+1987654321',
      address: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'USA',
      role: 'customer' as any,
    });

    // Create seller users
    await userService.create({
      email: 'seller1@ecommerce.com',
      password: 'seller123',
      firstName: 'Mike',
      lastName: 'Johnson',
      phoneNumber: '+1555123456',
      address: '789 Business Blvd',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'USA',
      role: 'seller' as any,
      businessName: 'Fashion Forward Store',
      businessDescription: 'Premium fashion items for the modern lifestyle',
      businessLicense: 'BL123456789',
      taxId: 'TAX123456789',
      isVerifiedSeller: true,
    });

    await userService.create({
      email: 'seller2@ecommerce.com',
      password: 'seller123',
      firstName: 'Sarah',
      lastName: 'Williams',
      phoneNumber: '+1555987654',
      address: '321 Commerce St',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      country: 'USA',
      role: 'seller' as any,
      businessName: 'Luxury Fragrances Co',
      businessDescription: 'Exclusive perfumes and fragrances from around the world',
      businessLicense: 'BL987654321',
      taxId: 'TAX987654321',
      isVerifiedSeller: false,
    });

    console.log('Users created successfully');
    console.log('Database seeding completed successfully!');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await app.close();
  }
}

seed();
