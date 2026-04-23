import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Student } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateStudentDto } from "./dto/create-student.dto";
import { ListStudentsQueryDto } from "./dto/list-students-query.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListStudentsQueryDto) {
    const q = query.q?.trim();
    const where: Prisma.StudentWhereInput | undefined = q
      ? {
          OR: [
            { studentNumber: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { middleName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined;

    const students = await this.prisma.student.findMany({
      where,
      include: {
        currentDepartment: {
          select: {
            id: true,
            name: true,
          },
        },
        currentProgram: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      items: students.map((student) => this.toResponse(student)),
      total: students.length,
    };
  }

  async getById(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        currentDepartment: {
          select: {
            id: true,
            name: true,
          },
        },
        currentProgram: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    return this.toResponse(student);
  }

  async create(dto: CreateStudentDto) {
    try {
      const student = await this.prisma.student.create({
        data: {
          studentNumber: dto.studentId.trim(),
          firstName: dto.firstName.trim(),
          middleName: dto.middleName?.trim() || null,
          lastName: dto.lastName.trim(),
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          phone: dto.phone?.trim() || null,
          admissionYear: dto.admissionYear ?? null,
          status: dto.status,
          currentDepartmentId: dto.departmentId ?? null,
          currentProgramId: dto.programId ?? null,
        },
        include: {
          currentDepartment: {
            select: {
              id: true,
              name: true,
            },
          },
          currentProgram: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return this.toResponse(student);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(id: string, dto: UpdateStudentDto) {
    try {
      const data: Prisma.StudentUncheckedUpdateInput = {};

      if (dto.studentId !== undefined) data.studentNumber = dto.studentId.trim();
      if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
      if (dto.middleName !== undefined) data.middleName = dto.middleName.trim() || null;
      if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
      if (dto.gender !== undefined) data.gender = dto.gender;
      if (dto.dateOfBirth !== undefined) {
        data.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
      }
      if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;
      if (dto.admissionYear !== undefined) data.admissionYear = dto.admissionYear;
      if (dto.status !== undefined) data.status = dto.status;
      if (dto.departmentId !== undefined) data.currentDepartmentId = dto.departmentId || null;
      if (dto.programId !== undefined) data.currentProgramId = dto.programId || null;

      const student = await this.prisma.student.update({
        where: { id },
        data,
        include: {
          currentDepartment: {
            select: {
              id: true,
              name: true,
            },
          },
          currentProgram: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return this.toResponse(student);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("Student not found");
      }

      this.handleWriteError(error);
    }
  }

  private toResponse(student: Student & {
    currentDepartment?: { id: string; name: string } | null;
    currentProgram?: { id: string; name: string } | null;
  }) {
    return {
      id: student.id,
      studentId: student.studentNumber,
      firstName: student.firstName,
      middleName: student.middleName,
      lastName: student.lastName,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      phone: student.phone,
      admissionYear: student.admissionYear,
      status: student.status,
      departmentId: student.currentDepartmentId,
      departmentName: student.currentDepartment?.name ?? null,
      programId: student.currentProgramId,
      programName: student.currentProgram?.name ?? null,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };
  }

  private handleWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictException("Student ID already exists");
    }

    throw error;
  }
}
