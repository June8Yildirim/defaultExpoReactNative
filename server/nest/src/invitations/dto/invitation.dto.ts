import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateInvitationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @Type(() => Date)
  @IsDate()
  eventDate: Date;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  message?: string;
}

export class UpdateInvitationDto extends PartialType(CreateInvitationDto) {}
