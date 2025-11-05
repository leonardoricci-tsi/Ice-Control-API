import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const { price, cost, isActive = true, currentQty = 0, minStock = 0, ...rest } = dto;

    return this.prisma.product.create({
      data: {
        ...rest,
        currentQty,
        minStock,
        price: new Prisma.Decimal(price),
        cost: new Prisma.Decimal(cost),
        isActive,
      },
      include: { category: true, supplier: true },
    });
  }

  findAll(params: {
    search?: string;
    categoryId?: string;
    supplierId?: string;
    onlyActive?: boolean;
  }) {
    const { search, categoryId, supplierId, onlyActive } = params;

    return this.prisma.product.findMany({
      where: {
        name: search
          ? {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            }
          : undefined,
        categoryId,
        supplierId,
        isActive: onlyActive ? true : undefined,
      },
      include: { category: true, supplier: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        supplier: true,
        stockMoves: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const { price, cost, ...rest } = dto;

    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          ...rest,
          price: typeof price === 'number' ? new Prisma.Decimal(price) : undefined,
          cost: typeof cost === 'number' ? new Prisma.Decimal(cost) : undefined,
        },
        include: { category: true, supplier: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Product not found');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.product.delete({ where: { id } });
      return { deleted: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Product not found');
      }
      throw error;
    }
  }
}
