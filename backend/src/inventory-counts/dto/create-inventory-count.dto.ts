import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
} from "class-validator";

import { Type } from "class-transformer";

class InventoryCountLineDto {
  @IsInt()
  productId!: number;

  @IsInt()
  @Min(0)
  countedQty!: number;
}

export class CreateInventoryCountDto {
  @IsInt()
  warehouseId!: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => InventoryCountLineDto)
  lines!: InventoryCountLineDto[];
}