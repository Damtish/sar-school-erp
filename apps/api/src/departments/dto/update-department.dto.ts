import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
