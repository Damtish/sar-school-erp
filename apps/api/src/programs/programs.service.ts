import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ProgramStatus } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateProgramDto } from "./dto/create-program.dto";
import { ListProgramsQueryDto } from "./dto/list-programs-query.dto";
import { UpdateProgramDto } from "./dto/update-program.dto";

@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListProgramsQueryDto) {
    const items = await this.prisma.program.findMany({
      where: {
        departmentId: query.departmentId || undefined,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    return {
      items: items.map((item) => this.toResponse(item)),
      total: items.length,
    };
  }

  async getById(id: string) {
    const item = await this.prisma.program.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException("Program not found");
    }

    return this.toResponse(item);
  }

  async create(dto: CreateProgramDto) {
    try {
      const item = await this.prisma.program.create({
        data: {
          departmentId: dto.departmentId,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          durationYears: dto.durationYears ?? null,
          status: dto.active === false ? ProgramStatus.INACTIVE : ProgramStatus.ACTIVE,
        },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      return this.toResponse(item);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(id: string, dto: UpdateProgramDto) {
    try {
      const item = await this.prisma.program.update({
        where: { id },
        data: {
          departmentId: dto.departmentId,
          code: dto.code?.trim().toUpperCase(),
          name: dto.name?.trim(),
          durationYears: dto.durationYears,
          status:
            dto.active === undefined
              ? undefined
              : dto.active
                ? ProgramStatus.ACTIVE
                : ProgramStatus.INACTIVE,
        },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      return this.toResponse(item);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("Program not found");
      }

      this.handleWriteError(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.program.delete({ where: { id } });
      return { deleted: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("Program not found");
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new ConflictException(
          "Cannot delete program while students or courses reference it",
        );
      }

      throw error;
    }
  }

  private toResponse(item: {
    id: string;
    departmentId: string;
    code: string;
    name: string;
    durationYears: number | null;
    status: ProgramStatus;
    createdAt: Date;
    updatedAt: Date;
    department?: { id: string; name: string; code: string };
  }) {
    return {
      id: item.id,
      departmentId: item.departmentId,
      departmentName: item.department?.name ?? null,
      code: item.code,
      name: item.name,
      durationYears: item.durationYears,
      active: item.status === ProgramStatus.ACTIVE,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private handleWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictException("Program code already exists");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      throw new ConflictException("Invalid departmentId");
    }

    throw error;
  }
}
