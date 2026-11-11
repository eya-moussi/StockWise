import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';


export enum WarehouseType {
  PRINCIPAL = 'PRINCIPAL',
  PRODUCTION = 'PRODUCTION',
  DISTRIBUTION = 'DISTRIBUTION',
  RETOUR = 'RETOUR',
  REBUT = 'REBUT',
}


export class CreateWarehouseDto {

  @IsString()
  @IsNotEmpty()
  name!: string;


  @IsEnum(WarehouseType)
  type!: WarehouseType;


  @IsOptional()
  @IsString()
  description?: string;
}