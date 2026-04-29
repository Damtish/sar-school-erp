import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InvoiceStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      totalStudents,
      totalDepartments,
      unpaidInvoices,
      paidThisMonthAggregate,
      paidThisMonthCount,
    ] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.department.count(),
      this.prisma.invoice.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
        where: { status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          paidAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
          status: PaymentStatus.POSTED,
        },
      }),
      this.prisma.payment.count({
        where: {
          paidAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
          status: PaymentStatus.POSTED,
        },
      }),
    ]);

    return {
      totalStudents,
      totalDepartments,
      unpaidInvoicesCount: unpaidInvoices._count._all,
      unpaidInvoicesAmount: Number(unpaidInvoices._sum.amount ?? 0),
      paidThisMonthAmount: Number(paidThisMonthAggregate._sum.amount ?? 0),
      paidThisMonthCount,
    };
  }

  async listInvoices() {
    const items = await this.prisma.invoice.findMany({
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return {
      items: items.map((item) => this.toInvoiceResponse(item)),
      total: items.length,
    };
  }

  async getInvoiceById(id: string) {
    const item = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException("Invoice not found");
    }

    return this.toInvoiceResponse(item);
  }

  async createInvoice(dto: CreateInvoiceDto) {
    try {
      const student = await this.prisma.student.findUnique({
        where: { studentNumber: dto.studentNumber.trim() },
      });
      if (!student) {
        throw new NotFoundException(
          `Student not found for student number ${dto.studentNumber}`,
        );
      }

      const item = await this.prisma.invoice.create({
        data: {
          studentId: student.id,
          amount: new Prisma.Decimal(dto.amount),
          dueDate: this.parseDateOrThrow(dto.dueDate, "dueDate"),
          status: InvoiceStatus.UNPAID,
        },
        include: {
          student: {
            select: {
              id: true,
              studentNumber: true,
              firstName: true,
              middleName: true,
              lastName: true,
            },
          },
        },
      });

      return this.toInvoiceResponse(item);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async updateInvoice(id: string, dto: UpdateInvoiceDto) {
    try {
      const item = await this.prisma.invoice.update({
        where: { id },
        data: {
          studentId: dto.studentId,
          amount: dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
          dueDate: dto.dueDate
            ? this.parseDateOrThrow(dto.dueDate, "dueDate")
            : undefined,
          status: dto.status,
        },
        include: {
          student: {
            select: {
              id: true,
              studentNumber: true,
              firstName: true,
              middleName: true,
              lastName: true,
            },
          },
        },
      });

      await this.recalculateInvoiceStatus(item.id);
      return this.getInvoiceById(item.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("Invoice not found");
      }

      this.handleWriteError(error);
    }
  }

  async deleteInvoice(id: string) {
    try {
      await this.prisma.invoice.delete({ where: { id } });
      return { deleted: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("Invoice not found");
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new ConflictException(
          "Cannot delete invoice while payments reference it",
        );
      }
      throw error;
    }
  }

  async listPayments() {
    const items = await this.prisma.payment.findMany({
      where: { invoiceId: { not: null } },
      include: {
        invoice: {
          include: {
            student: {
              select: {
                id: true,
                studentNumber: true,
                firstName: true,
                middleName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: [{ paidAt: "desc" }],
    });

    return {
      items: items.map((item) => this.toPaymentResponse(item)),
      total: items.length,
    };
  }

  async getPaymentById(id: string) {
    const item = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            student: {
              select: {
                id: true,
                studentNumber: true,
                firstName: true,
                middleName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!item || !item.invoiceId) {
      throw new NotFoundException("Payment not found");
    }

    return this.toPaymentResponse(item);
  }

  async createPayment(dto: CreatePaymentDto) {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: dto.invoiceId },
      });
      if (!invoice) {
        throw new NotFoundException("Invoice not found");
      }
      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new BadRequestException("Cannot record payment for cancelled invoice");
      }

      const item = await this.prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          studentId: invoice.studentId,
          amount: new Prisma.Decimal(dto.amount),
          paidAt: dto.paidAt ? this.parseDateOrThrow(dto.paidAt, "paidAt") : new Date(),
          paymentMethod: dto.method,
          status: PaymentStatus.POSTED,
        },
        include: {
          invoice: {
            include: {
              student: {
                select: {
                  id: true,
                  studentNumber: true,
                  firstName: true,
                  middleName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      await this.recalculateInvoiceStatus(invoice.id);
      return this.toPaymentResponse(item);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async updatePayment(id: string, dto: UpdatePaymentDto) {
    try {
      const existing = await this.prisma.payment.findUnique({
        where: { id },
      });
      if (!existing || !existing.invoiceId) {
        throw new NotFoundException("Payment not found");
      }

      const targetInvoiceId = dto.invoiceId ?? existing.invoiceId;
      const targetInvoice = await this.prisma.invoice.findUnique({
        where: { id: targetInvoiceId },
      });
      if (!targetInvoice) {
        throw new NotFoundException("Invoice not found");
      }
      if (targetInvoice.status === InvoiceStatus.CANCELLED) {
        throw new BadRequestException("Cannot assign payment to cancelled invoice");
      }

      const item = await this.prisma.payment.update({
        where: { id },
        data: {
          invoiceId: targetInvoice.id,
          studentId: targetInvoice.studentId,
          amount: dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
          paidAt: dto.paidAt ? this.parseDateOrThrow(dto.paidAt, "paidAt") : undefined,
          paymentMethod: dto.method as PaymentMethod | undefined,
        },
        include: {
          invoice: {
            include: {
              student: {
                select: {
                  id: true,
                  studentNumber: true,
                  firstName: true,
                  middleName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      await this.recalculateInvoiceStatus(existing.invoiceId);
      if (existing.invoiceId !== targetInvoice.id) {
        await this.recalculateInvoiceStatus(targetInvoice.id);
      }

      return this.toPaymentResponse(item);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async deletePayment(id: string) {
    const existing = await this.prisma.payment.findUnique({ where: { id } });
    if (!existing || !existing.invoiceId) {
      throw new NotFoundException("Payment not found");
    }

    await this.prisma.payment.delete({ where: { id } });
    await this.recalculateInvoiceStatus(existing.invoiceId);
    return { deleted: true };
  }

  async studentBalanceLookup(query: { studentId?: string; studentNumber?: string }) {
    const hasStudentId = Boolean(query.studentId?.trim());
    const hasStudentNumber = Boolean(query.studentNumber?.trim());
    if (!hasStudentId && !hasStudentNumber) {
      throw new BadRequestException("Provide studentNumber for balance lookup");
    }

    const student =
      hasStudentId
        ? await this.prisma.student.findUnique({
            where: { id: query.studentId!.trim() },
          })
        : hasStudentNumber
          ? await this.prisma.student.findUnique({
              where: { studentNumber: query.studentNumber!.trim() },
            })
          : null;

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const [invoiceAgg, paymentAgg, invoices] = await Promise.all([
      this.prisma.invoice.aggregate({
        _sum: { amount: true },
        where: {
          studentId: student.id,
          status: { not: InvoiceStatus.CANCELLED },
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          studentId: student.id,
          invoiceId: { not: null },
          status: PaymentStatus.POSTED,
        },
      }),
      this.prisma.invoice.findMany({
        where: {
          studentId: student.id,
        },
        orderBy: [{ createdAt: "desc" }],
      }),
    ]);

    const totalInvoices = Number(invoiceAgg._sum.amount ?? 0);
    const totalPaid = Number(paymentAgg._sum.amount ?? 0);

    return {
      student: {
        id: student.id,
        studentId: student.studentNumber,
        name: [student.firstName, student.middleName, student.lastName]
          .filter(Boolean)
          .join(" "),
      },
      totalInvoices,
      totalInvoiced: totalInvoices,
      totalPaid,
      balance: totalInvoices - totalPaid,
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        amount: Number(invoice.amount),
        dueDate: invoice.dueDate,
        status: invoice.status,
        createdAt: invoice.createdAt,
      })),
    };
  }

  async getStudentBalanceById(studentId: string) {
    const result = await this.studentBalanceLookup({ studentId });
    return {
      totalInvoices: result.totalInvoices,
      totalPaid: result.totalPaid,
      balance: result.balance,
    };
  }

  private async recalculateInvoiceStatus(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice || invoice.status === InvoiceStatus.CANCELLED) {
      return;
    }

    const paymentAgg = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        invoiceId,
        status: PaymentStatus.POSTED,
      },
    });

    const paid = Number(paymentAgg._sum.amount ?? 0);
    const total = Number(invoice.amount);
    let status: InvoiceStatus = InvoiceStatus.UNPAID;

    if (paid <= 0) status = InvoiceStatus.UNPAID;
    else if (paid < total) status = InvoiceStatus.PARTIAL;
    else status = InvoiceStatus.PAID;

    if (status !== invoice.status) {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status },
      });
    }
  }

  private toInvoiceResponse(item: {
    id: string;
    studentId: string;
    amount: Prisma.Decimal;
    dueDate: Date;
    status: InvoiceStatus;
    createdAt: Date;
    updatedAt: Date;
    student?: {
      id: string;
      studentNumber: string;
      firstName: string;
      middleName: string | null;
      lastName: string;
    };
  }) {
    return {
      id: item.id,
      studentId: item.studentId,
      amount: Number(item.amount),
      dueDate: item.dueDate,
      status: item.status,
      createdAt: item.createdAt,
      student: item.student
        ? {
            id: item.student.id,
            studentId: item.student.studentNumber,
            name: [item.student.firstName, item.student.middleName, item.student.lastName]
              .filter(Boolean)
              .join(" "),
          }
        : null,
    };
  }

  private toPaymentResponse(item: {
    id: string;
    invoiceId: string | null;
    amount: Prisma.Decimal;
    paymentMethod: PaymentMethod;
    paidAt: Date;
    createdAt: Date;
    invoice?: {
      id: string;
      student?: {
        id: string;
        studentNumber: string;
        firstName: string;
        middleName: string | null;
        lastName: string;
      } | null;
    } | null;
  }) {
    return {
      id: item.id,
      invoiceId: item.invoiceId,
      amount: Number(item.amount),
      method: item.paymentMethod,
      paidAt: item.paidAt,
      createdAt: item.createdAt,
      student: item.invoice?.student
        ? {
            id: item.invoice.student.id,
            studentId: item.invoice.student.studentNumber,
            name: [
              item.invoice.student.firstName,
              item.invoice.student.middleName,
              item.invoice.student.lastName,
            ]
              .filter(Boolean)
              .join(" "),
          }
        : null,
    };
  }

  private handleWriteError(error: unknown): never {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof ConflictException
    ) {
      throw error;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      throw new ConflictException("Invalid student or invoice reference");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new NotFoundException("Requested record was not found");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2023") {
      throw new BadRequestException("Invalid identifier format");
    }
    if (error instanceof Prisma.PrismaClientValidationError) {
      throw new BadRequestException("Invalid finance payload");
    }
    if (error instanceof Error) {
      throw new InternalServerErrorException(`Finance operation failed: ${error.message}`);
    }
    throw new InternalServerErrorException("Finance operation failed");
  }

  private parseDateOrThrow(value: string, fieldName: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }
    return parsed;
  }
}
