import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsPositive,
} from 'class-validator';


export enum ReturnType {
  RETURN_CLIENT = 'RETURN_CLIENT',
  RETURN_SUPPLIER = 'RETURN_SUPPLIER',
}


export class CreateReturnDto {

  @IsEnum(ReturnType)
  type!: ReturnType;


  @IsInt()
  @IsPositive()
  quantity!: number;


  @IsInt()
  productId!: number;


  @IsInt()
  warehouseId!: number;


  @IsOptional()
  @IsString()
  reference?: string;

}