import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

export class QueryProductDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['id', 'name', 'reference'])
  sortBy?: 'id' | 'name' | 'reference';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}