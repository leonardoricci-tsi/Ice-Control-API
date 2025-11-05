import { IsEnum, IsISO8601, IsOptional } from 'class-validator';
import { OrderStatus, PaymentMethod } from '@prisma/client';

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}
