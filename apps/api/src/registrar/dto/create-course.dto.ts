import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class CreateCourseDto {
  @IsString()
  @MaxLength(50)
  courseCode!: string;

  @IsString()
  @MaxLength(150)
  courseName!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  creditHour!: number;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  programId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesterNumber!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
