import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DepartmentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const items = await this.prisma.department.findMany({
      orderBy: { name: "asc" },
    });

    return {
      items: items.map((item) => this.toResponse(item)),
      total: items.length,
    };
  }

  async getById(id: string) {
    const item = await this.prisma.department.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException("Department not found");
    }

    return this.toResponse(item);
  }

  async create(dto: CreateDepartmentDto) {
    try {
      const item = await this.prisma.department.create({
        data: {
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          status: dto.active === false ? DepartmentStatus.INACTIVE : DepartmentStatus.ACTIVE,
        },
      });

      return this.toResponse(item);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    try {
      const item = await this.prisma.department.update({
        where: { id },
        data: {
          code: dto.code?.trim().toUpperCase(),
          name: dto.name?.trim(),
          status:
            dto.active === undefined
              ? undefined
              : dto.active
                ? DepartmentStatus.ACTIVE
                : DepartmentStatus.INACTIVE,
        },
      });

      return this.toResponse(item);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("Department not found");
      }

      this.handleWriteError(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.department.delete({ where: { id } });
      return { deleted: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("Department not found");
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new ConflictException(
          "Cannot delete department while programs or students reference it",
        );
      }

      throw error;
    }
  }

  private toResponse(item: {
    id: string;
    code: string;
    name: string;
    status: DepartmentStatus;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      code: item.code,
      name: item.name,
      active: item.status === DepartmentStatus.ACTIVE,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private handleWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictException("Department code already exists");
    }

    throw error;
  }
}
