import { Type } from "class-transformer";
import { IsDateString, IsNumber, IsString, Min } from "class-validator";

export class CreateInvoiceDto {
  @IsString()
  studentId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsDateString()
  dueDate!: string;
}
