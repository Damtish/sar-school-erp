import { IsOptional, IsString, MaxLength } from "class-validator";

export class ListStudentsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
