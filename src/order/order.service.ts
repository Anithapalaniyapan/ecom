import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { CreateOrderDto, UpdateOrderStatusDto, UpdatePaymentStatusDto, OrderFilterDto } from './dto/order.dto';
import { CartService } from '../cart/cart.service';
import { ProductService } from '../product/product.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    private cartService: CartService,
    private productService: ProductService,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    const { orderItems, shippingAddress, billingAddress, paymentMethod, notes } = createOrderDto;

    // Validate products and check stock
    for (const item of orderItems) {
      const product = await this.productService.findById(item.productId);
      
      if (!product.isInStock) {
        throw new BadRequestException(`Product ${product.name} is out of stock`);
      }

      if (product.stockQuantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }
    }

    // Calculate totals
    let subtotal = 0;
    const orderItemsData: Array<{
      productId: string;
      quantity: number;
      price: number;
      selectedSize?: string;
      selectedColor?: string;
    }> = [];

    for (const item of orderItems) {
      const product = await this.productService.findById(item.productId);
      const itemPrice = product.price;
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        price: itemPrice,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor,
      });
    }

    // Calculate shipping and tax (simplified)
    const shippingCost = subtotal > 100 ? 0 : 10; // Free shipping over $100
    const taxAmount = subtotal * 0.08; // 8% tax
    const totalAmount = subtotal + shippingCost + taxAmount;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order
    const order = this.orderRepository.create({
      orderNumber,
      subtotal,
      shippingCost,
      taxAmount,
      totalAmount,
      shippingAddress,
      billingAddress,
      paymentMethod,
      notes,
      userId,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Create order items
    for (const itemData of orderItemsData) {
      const orderItem = this.orderItemRepository.create({
        productId: itemData.productId,
        quantity: itemData.quantity,
        price: itemData.price,
        selectedSize: itemData.selectedSize,
        selectedColor: itemData.selectedColor,
        orderId: savedOrder.id,
      });
      await this.orderItemRepository.save(orderItem);

      // Update product stock
      await this.productService.updateStock(itemData.productId, itemData.quantity);
    }

    // Clear user's cart
    await this.cartService.clearCart(userId);

    return this.findById(savedOrder.id);
  }

  async findAll(filterDto: OrderFilterDto = {}): Promise<{ orders: Order[]; total: number }> {
    const {
      status,
      paymentStatus,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 20,
    } = filterDto;

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .leftJoinAndSelect('orderItems.product', 'product');

    // Status filter
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    // Payment status filter
    if (paymentStatus) {
      queryBuilder.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus });
    }

    // Sorting
    queryBuilder.orderBy(`order.${sortBy}`, sortOrder);

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return { orders, total };
  }

  async findByUser(userId: string, filterDto: OrderFilterDto = {}): Promise<{ orders: Order[]; total: number }> {
    const {
      status,
      paymentStatus,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 20,
    } = filterDto;

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .leftJoinAndSelect('orderItems.product', 'product')
      .where('order.userId = :userId', { userId });

    // Status filter
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    // Payment status filter
    if (paymentStatus) {
      queryBuilder.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus });
    }

    // Sorting
    queryBuilder.orderBy(`order.${sortBy}`, sortOrder);

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return { orders, total };
  }

  async findById(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user', 'orderItems', 'orderItems.product'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findByOrderNumber(orderNumber: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { orderNumber },
      relations: ['user', 'orderItems', 'orderItems.product'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.findById(id);
    order.status = updateOrderStatusDto.status as any;
    return this.orderRepository.save(order);
  }

  async updatePaymentStatus(id: string, updatePaymentStatusDto: UpdatePaymentStatusDto): Promise<Order> {
    const order = await this.findById(id);
    order.paymentStatus = updatePaymentStatusDto.paymentStatus as any;
    if (updatePaymentStatusDto.paymentId) {
      order.paymentId = updatePaymentStatusDto.paymentId;
    }
    return this.orderRepository.save(order);
  }

  async cancelOrder(id: string): Promise<Order> {
    const order = await this.findById(id);

    if (order.status === 'delivered' || order.status === 'cancelled') {
      throw new BadRequestException('Cannot cancel this order');
    }

    // Restore stock
    for (const orderItem of order.orderItems) {
      const product = await this.productService.findById(orderItem.productId);
      product.stockQuantity += orderItem.quantity;
      product.salesCount -= orderItem.quantity;
      await this.productService.update(orderItem.productId, product);
    }

    order.status = 'cancelled' as any;
    return this.orderRepository.save(order);
  }

  async getOrderStats(): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: { [key: string]: number };
  }> {
    const orders = await this.orderRepository.find();

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount.toString()), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const ordersByStatus = {};
    orders.forEach(order => {
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
    });

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      ordersByStatus,
    };
  }
}
