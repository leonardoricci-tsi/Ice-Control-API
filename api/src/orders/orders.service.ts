import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      const productIds = dto.items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        throw new NotFoundException('One or more products were not found');
      }

      const productMap = new Map(products.map((product) => [product.id, product]));

      let orderTotal = new Prisma.Decimal(0);
      const itemsData = dto.items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        if (product.currentQty < item.qty) {
          throw new BadRequestException(`Insufficient stock for product ${product.name}`);
        }

        const priceValue = typeof item.price === 'number' ? item.price : product.price.toNumber();
        const price = new Prisma.Decimal(priceValue);
        const total = price.times(item.qty);
        orderTotal = orderTotal.plus(total);

        return {
          productId: item.productId,
          qty: item.qty,
          price,
          total,
        };
      });

      const nextNumber = await this.getNextOrderNumber(tx, dto.number);

      const order = await tx.order.create({
        data: {
          number: nextNumber,
          customerId: dto.customerId,
          status: dto.status ?? OrderStatus.OPEN,
          paymentMethod: dto.paymentMethod,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          total: orderTotal,
          items: {
            create: itemsData,
          },
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      for (const item of itemsData) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentQty: { decrement: item.qty },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            qty: -item.qty,
            reason: 'ORDER_FULFILLED',
            referenceId: order.id,
          },
        });
      }

      return order;
    });
  }

  findAll(params: { status?: OrderStatus; customerId?: string; from?: string; to?: string }) {
    const { status, customerId, from, to } = params;

    return this.prisma.order.findMany({
      where: {
        status,
        customerId,
        createdAt: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async update(id: string, dto: UpdateOrderDto) {
    try {
      return await this.prisma.order.update({
        where: { id },
        data: {
          status: dto.status,
          paymentMethod: dto.paymentMethod,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        },
        include: {
          customer: true,
          items: {
            include: { product: true },
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Order not found');
      }
      throw error;
    }
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentQty: { increment: item.qty },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            qty: item.qty,
            reason: 'ORDER_CANCELLED',
            referenceId: id,
          },
        });
      }

      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });

      return { deleted: true };
    });
  }

  private async getNextOrderNumber(tx: Prisma.TransactionClient, preferred?: number) {
    if (typeof preferred === 'number') {
      return preferred;
    }

    const lastOrder = await tx.order.findFirst({
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    return (lastOrder?.number ?? 0) + 1;
  }
}
