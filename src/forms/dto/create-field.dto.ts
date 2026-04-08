import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { FieldType } from '@prisma/client';

export class CreateFieldDto {
  @IsEnum(FieldType)
  type: FieldType;

  @IsString()
  label: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  options?: any; // keep simple for now (array of strings later)
}
