import {
  IsArray,
  IsInt,
  ValidateNested,
} from "class-validator";

import { Type } from "class-transformer";

class InventoryCountLineDto {
  @IsInt()
  productId!: number;

  @IsInt()
  countedQty!: number;
}

export class CreateInventoryCountDto {
  @IsInt()
  warehouseId!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryCountLineDto)
  lines!: InventoryCountLineDto[];
}