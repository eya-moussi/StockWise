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
  TRANSFER = 'TRANSFER',
  RETURN_CLIENT = 'RETURN_CLIENT',
  RETURN_SUPPLIER = 'RETURN_SUPPLIER',
  CORRECTION = 'CORRECTION',
}


export class CreateStockMovementDto {

  @IsOptional()
@IsEnum(StockMovementType)
type?: StockMovementType;


  @IsInt()
  @IsPositive()
  quantity!: number;


  @IsInt()
  productId!: number;


  @IsInt()
  warehouseId!: number;


  @IsOptional()
  @IsInt()
  locationId?: number;


  @IsOptional()
  @IsString()
  reference?: string;

}