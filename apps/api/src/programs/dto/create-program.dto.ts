import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateProgramDto {
  @IsString()
  departmentId!: string;

  @IsString()
  @MaxLength(20)
  code!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationYears?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
