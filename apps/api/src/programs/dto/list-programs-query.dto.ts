import { IsOptional, IsString } from "class-validator";

export class ListProgramsQueryDto {
  @IsOptional()
  @IsString()
  departmentId?: string;
}
