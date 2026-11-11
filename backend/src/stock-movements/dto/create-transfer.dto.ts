import {
  IsInt,
  IsPositive,
  IsString,
  IsOptional,
} from 'class-validator';

export class CreateTransferDto {

  @IsInt()
  productId!: number;

  @IsInt()
  fromWarehouseId!: number;

  @IsInt()
  toWarehouseId!: number;

  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsString()
  reference?: string;

}