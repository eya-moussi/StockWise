import {
  IsInt,
  IsPositive,
  IsString,
  IsOptional,
} from 'class-validator';

export class CreateTransferDto {

  @IsInt()
  @IsPositive()
  productId!: number;

  @IsInt()
  @IsPositive()
  fromWarehouseId!: number;

  @IsInt()
  @IsPositive()
  toWarehouseId!: number;

  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsString()
  reference?: string;

}