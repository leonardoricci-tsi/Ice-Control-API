import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStockMovementDto {
  @IsUUID()
  productId: string;

  @Type(() => Number)
  @IsInt()
  qty: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;
}
