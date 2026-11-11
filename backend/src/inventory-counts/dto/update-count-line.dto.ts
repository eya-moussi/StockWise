import {
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';


export class UpdateCountLineDto {

  @IsInt()
  @Min(0)
  countedQty!: number;


  @IsOptional()
  @IsString()
  justification?: string;

}