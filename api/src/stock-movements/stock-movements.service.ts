import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStockMovementDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: dto.productId } });
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (dto.qty < 0 && product.currentQty < Math.abs(dto.qty)) {
        throw new BadRequestException('Insufficient stock to register the movement');
      }

      const movement = await tx.stockMovement.create({
        data: dto,
      });

      let updatedProduct = product;

      if (dto.qty > 0) {
        await tx.product.update({
          where: { id: dto.productId },
          data: {
            currentQty: { increment: dto.qty },
          },
        });
        updatedProduct = await tx.product.findUnique({ where: { id: dto.productId } });
      } else if (dto.qty < 0) {
        const result = await tx.product.update({
          where: { id: dto.productId },
          data: {
            currentQty: { decrement: Math.abs(dto.qty) },
          },
        });
        updatedProduct = result;
      }

      return {
        ...movement,
        product: updatedProduct,
      };
    });
  }

  findAll(params: { productId?: string; from?: string; to?: string }) {
    const { productId, from, to } = params;

    return this.prisma.stockMovement.findMany({
      where: {
        productId,
        createdAt: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const movement = await this.prisma.stockMovement.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!movement) {
      throw new NotFoundException('Stock movement not found');
    }

    return movement;
  }
}
