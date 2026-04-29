import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";
import { FinanceService } from "./finance.service";

@UseGuards(JwtAuthGuard)
@Controller("finance")
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("overview")
  getOverview() {
    return this.financeService.getOverview();
  }

  @Get("invoices")
  listInvoices() {
    return this.financeService.listInvoices();
  }

  @Get("invoices/:id")
  getInvoiceById(@Param("id") id: string) {
    return this.financeService.getInvoiceById(id);
  }

  @Post("invoices")
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.financeService.createInvoice(dto);
  }

  @Put("invoices/:id")
  updateInvoice(@Param("id") id: string, @Body() dto: UpdateInvoiceDto) {
    return this.financeService.updateInvoice(id, dto);
  }

  @Delete("invoices/:id")
  deleteInvoice(@Param("id") id: string) {
    return this.financeService.deleteInvoice(id);
  }

  @Get("payments")
  listPayments() {
    return this.financeService.listPayments();
  }

  @Get("payments/:id")
  getPaymentById(@Param("id") id: string) {
    return this.financeService.getPaymentById(id);
  }

  @Post("payments")
  createPayment(@Body() dto: CreatePaymentDto) {
    return this.financeService.createPayment(dto);
  }

  @Put("payments/:id")
  updatePayment(@Param("id") id: string, @Body() dto: UpdatePaymentDto) {
    return this.financeService.updatePayment(id, dto);
  }

  @Delete("payments/:id")
  deletePayment(@Param("id") id: string) {
    return this.financeService.deletePayment(id);
  }

  @Get("student-balance")
  studentBalanceLookup(
    @Query("studentId") studentId?: string,
    @Query("studentNumber") studentNumber?: string,
  ) {
    return this.financeService.studentBalanceLookup({ studentId, studentNumber });
  }

  @Get("balance/:studentId")
  studentBalanceById(@Param("studentId") studentId: string) {
    return this.financeService.getStudentBalanceById(studentId);
  }
}
