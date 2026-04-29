import { IsIn, IsString, IsUUID, MaxLength } from "class-validator";

const GRADE_LETTERS = ["A", "B+", "B", "C+", "C", "D", "F"] as const;

export class CreateGradeDto {
  @IsString()
  @MaxLength(50)
  studentNumber!: string;

  @IsUUID()
  courseId!: string;

  @IsString()
  @MaxLength(20)
  academicYear!: string;

  @IsString()
  @MaxLength(20)
  semester!: string;

  @IsString()
  @IsIn(GRADE_LETTERS)
  gradeLetter!: (typeof GRADE_LETTERS)[number];
}
