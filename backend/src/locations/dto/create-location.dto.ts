import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLocationDto {

  @IsString()
  @IsNotEmpty()
  code!: string;


  @IsString()
  @IsNotEmpty()
  name!: string;


  @IsOptional()
  @IsString()
  description?: string;
}