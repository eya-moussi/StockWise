import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
} from 'class-validator';

export class QueryStockMovementDto {

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  warehouseId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  locationId?: number;

}