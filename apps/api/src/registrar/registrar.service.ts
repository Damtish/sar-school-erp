import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Semester } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateCourseDto } from "./dto/create-course.dto";
import { CreateGradeDto } from "./dto/create-grade.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";

const GRADE_POINTS: Record<string, number> = {
  A: 4.0,
  "B+": 3.5,
  B: 3.0,
  "C+": 2.5,
  C: 2.0,
  D: 1.0,
  F: 0.0,
};

@Injectable()
export class RegistrarService {
  constructor(private readonly prisma: PrismaService) {}

  async listCourses() {
    const items = await this.prisma.course.findMany({
      include: {
        department: { select: { id: true, name: true, code: true } },
        program: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return {
      items: items.map((item) => this.toCourseResponse(item)),
      total: items.length,
    };
  }

  async createCourse(dto: CreateCourseDto) {
    try {
      await this.validateCourseRefs(dto.departmentId, dto.programId);
      const created = await this.prisma.course.create({
        data: {
          code: dto.courseCode.trim(),
          title: dto.courseName.trim(),
          creditHours: dto.creditHour,
          departmentId: dto.departmentId ?? null,
          programId: dto.programId ?? null,
          isActive: dto.active ?? true,
        },
        include: {
          department: { select: { id: true, name: true, code: true } },
          program: { select: { id: true, name: true, code: true } },
        },
      });

      return this.toCourseResponse(created);
    } catch (error) {
      this.handlePrismaError(error, "Course");
    }
  }

  async updateCourse(id: string, dto: UpdateCourseDto) {
    try {
      if (dto.departmentId !== undefined || dto.programId !== undefined) {
        await this.validateCourseRefs(dto.departmentId, dto.programId);
      }

      const updated = await this.prisma.course.update({
        where: { id },
        data: {
          code: dto.courseCode?.trim(),
          title: dto.courseName?.trim(),
          creditHours: dto.creditHour,
          departmentId: dto.departmentId,
          programId: dto.programId,
          isActive: dto.active,
        },
        include: {
          department: { select: { id: true, name: true, code: true } },
          program: { select: { id: true, name: true, code: true } },
        },
      });

      return this.toCourseResponse(updated);
    } catch (error) {
      this.handlePrismaError(error, "Course");
    }
  }

  async deleteCourse(id: string) {
    try {
      await this.prisma.course.delete({ where: { id } });
      return { deleted: true };
    } catch (error) {
      this.handlePrismaError(error, "Course");
    }
  }

  async createGrade(dto: CreateGradeDto) {
    try {
      const student = await this.prisma.student.findUnique({
        where: { studentNumber: dto.studentNumber.trim() },
      });
      if (!student) {
        throw new NotFoundException(
          `Student not found for student number ${dto.studentNumber}`,
        );
      }

      const course = await this.prisma.course.findUnique({
        where: { id: dto.courseId },
      });
      if (!course) {
        throw new NotFoundException("Course not found");
      }

      const gradePoint = GRADE_POINTS[dto.gradeLetter];
      const created = await this.prisma.gradeRecord.upsert({
        where: {
          studentId_courseId_semester_academicYear: {
            studentId: student.id,
            courseId: course.id,
            semester: this.mapSemester(dto.semester),
            academicYear: dto.academicYear.trim(),
          },
        },
        create: {
          studentId: student.id,
          courseId: course.id,
          academicYear: dto.academicYear.trim(),
          semester: this.mapSemester(dto.semester),
          grade: dto.gradeLetter,
          gradePoint: new Prisma.Decimal(gradePoint),
        },
        update: {
          grade: dto.gradeLetter,
          gradePoint: new Prisma.Decimal(gradePoint),
        },
        include: {
          course: true,
          student: true,
        },
      });

      return {
        id: created.id,
        studentNumber: created.student.studentNumber,
        courseId: created.courseId,
        courseCode: created.course.code,
        courseName: created.course.title,
        creditHour: created.course.creditHours ?? 0,
        academicYear: created.academicYear,
        semester: created.semester,
        gradeLetter: created.grade,
        gradePoint: Number(created.gradePoint ?? 0),
      };
    } catch (error) {
      this.handlePrismaError(error, "Grade");
    }
  }

  async getStudentGrades(studentNumber: string) {
    const student = await this.prisma.student.findUnique({
      where: { studentNumber: studentNumber.trim() },
    });
    if (!student) {
      throw new NotFoundException(`Student not found for student number ${studentNumber}`);
    }

    const grades = await this.prisma.gradeRecord.findMany({
      where: { studentId: student.id },
      include: { course: true },
      orderBy: [{ academicYear: "desc" }, { recordedAt: "desc" }],
    });

    const gradeItems = grades.map((record) => {
      const creditHour = record.course.creditHours ?? 0;
      const gradePoint = Number(record.gradePoint ?? 0);
      return {
        id: record.id,
        courseId: record.courseId,
        courseCode: record.course.code,
        courseName: record.course.title,
        creditHour,
        academicYear: record.academicYear,
        semester: record.semester,
        gradeLetter: record.grade,
        gradePoint,
        weightedPoints: gradePoint * creditHour,
      };
    });

    const totalCredits = gradeItems.reduce((sum, item) => sum + item.creditHour, 0);
    const totalWeightedPoints = gradeItems.reduce(
      (sum, item) => sum + item.weightedPoints,
      0,
    );
    const gpa = totalCredits > 0 ? totalWeightedPoints / totalCredits : 0;

    return {
      student: {
        id: student.id,
        studentNumber: student.studentNumber,
        name: [student.firstName, student.middleName, student.lastName]
          .filter(Boolean)
          .join(" "),
      },
      grades: gradeItems,
      summary: {
        totalCredits,
        totalWeightedPoints,
        gpa: Number(gpa.toFixed(2)),
      },
    };
  }

  private async validateCourseRefs(departmentId?: string, programId?: string) {
    if (departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department) {
        throw new BadRequestException("Invalid departmentId");
      }
    }
    if (programId) {
      const program = await this.prisma.program.findUnique({
        where: { id: programId },
      });
      if (!program) {
        throw new BadRequestException("Invalid programId");
      }
      if (departmentId && program.departmentId !== departmentId) {
        throw new BadRequestException(
          "programId does not belong to the provided departmentId",
        );
      }
    }
  }

  private mapSemester(value: string) {
    const normalized = value.trim().toUpperCase();
    if (normalized === "1" || normalized === "SEMESTER_1") return Semester.SEMESTER_1;
    if (normalized === "2" || normalized === "SEMESTER_2") return Semester.SEMESTER_2;
    if (normalized === "3" || normalized === "SUMMER") return Semester.SUMMER;
    throw new BadRequestException("Invalid semester");
  }

  private toCourseResponse(
    item: {
      id: string;
      code: string;
      title: string;
      creditHours: number | null;
      departmentId: string | null;
      programId: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      department?: { id: string; name: string; code: string } | null;
      program?: { id: string; name: string; code: string } | null;
    },
  ) {
    return {
      id: item.id,
      courseCode: item.code,
      courseName: item.title,
      creditHour: item.creditHours ?? 0,
      departmentId: item.departmentId,
      programId: item.programId,
      semesterNumber: null,
      active: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      department: item.department ?? null,
      program: item.program ?? null,
    };
  }

  private handlePrismaError(error: unknown, entity: "Course" | "Grade"): never {
    if (error instanceof BadRequestException || error instanceof NotFoundException) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictException(`${entity} with this unique value already exists`);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new NotFoundException(`${entity} not found`);
    }

    throw error;
  }
}
