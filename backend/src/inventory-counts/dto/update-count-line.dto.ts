import {
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';


export class UpdateCountLineDto {

  @IsInt()
  countedQty!: number;


  @IsOptional()
  @IsString()
  justification?: string;

}