import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  courseCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  courseName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  creditHour?: number;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  programId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesterNumber?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
