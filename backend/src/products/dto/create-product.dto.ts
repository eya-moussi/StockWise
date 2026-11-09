import { IsString, IsInt, Min, IsNotEmpty } from 'class-validator';

export class CreateProductDto {

  @IsString()
  @IsNotEmpty()
  reference!: string;


  @IsString()
  @IsNotEmpty()
  name!: string;


  @IsInt()
  @Min(0)
  minStock!: number;


  @IsInt()
  @Min(1)
  categoryId!: number;
}