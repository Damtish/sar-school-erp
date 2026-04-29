import { Type } from "class-transformer";
import { IsDateString, IsNumber, IsString, MaxLength, Min } from "class-validator";

export class CreateInvoiceDto {
  @IsString()
  @MaxLength(50)
  studentNumber!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsDateString()
  dueDate!: string;
}
