import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  NotEquals,
} from 'class-validator';

/** Quantity is a signed stock delta: positive adds, negative removes, zero is invalid. */
export class CreateCorrectionDto {
  @IsInt()
  @IsPositive()
  productId!: number;

  @IsInt()
  @IsPositive()
  warehouseId!: number;

  @IsInt()
  @NotEquals(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}