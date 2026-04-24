import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateDepartmentDto {
  @IsString()
  @MaxLength(20)
  code!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
