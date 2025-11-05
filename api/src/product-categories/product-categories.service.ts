import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

@Injectable()
export class ProductCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProductCategoryDto) {
    return this.prisma.productCategory.create({ data: dto });
  }

  findAll() {
    return this.prisma.productCategory.findMany({
      orderBy: { name: 'asc' },
      include: { products: { include: { supplier: true } } },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
      include: { products: { include: { supplier: true } } },
    });

    if (!category) {
      throw new NotFoundException('Product category not found');
    }

    return category;
  }

  async update(id: string, dto: UpdateProductCategoryDto) {
    try {
      return await this.prisma.productCategory.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Product category not found');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.productCategory.delete({ where: { id } });
      return { deleted: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Product category not found');
      }
      throw error;
    }
  }
}
