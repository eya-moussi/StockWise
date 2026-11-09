import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsPositive,
} from 'class-validator';

export enum StockMovementType {
  IN = 'IN',
  OUT = 'OUT',
}

export class StockMovementFieldsDto {
  @IsInt()
  @IsPositive()
  productId!: number;

  @IsInt()
  @IsPositive()
  warehouseId!: number;

  @IsOptional()
  @IsInt()
  locationId?: number;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateStockMovementInputDto extends StockMovementFieldsDto {
  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class CreateStockMovementDto extends CreateStockMovementInputDto {
  @IsEnum(StockMovementType)
  type!: StockMovementType;
}
