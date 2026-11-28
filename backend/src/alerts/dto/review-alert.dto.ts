import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AlertStatus } from '@prisma/client';

export class ReviewAlertDto {
  @IsIn([AlertStatus.CONFIRMED, AlertStatus.NORMAL])
  status: AlertStatus;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment: string;
}
