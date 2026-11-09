import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

import { Type } from "class-transformer";

class JustificationDto {
  lineId!: number;

  @IsOptional()
  @IsString()
  justification?: string;
}

export class ValidateCountDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JustificationDto)
  lines!: JustificationDto[];
}