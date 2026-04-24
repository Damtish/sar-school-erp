import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateProgramDto } from "./dto/create-program.dto";
import { ListProgramsQueryDto } from "./dto/list-programs-query.dto";
import { UpdateProgramDto } from "./dto/update-program.dto";
import { ProgramsService } from "./programs.service";

@UseGuards(JwtAuthGuard)
@Controller("programs")
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  list(@Query() query: ListProgramsQueryDto) {
    return this.programsService.list(query);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.programsService.getById(id);
  }

  @Post()
  create(@Body() dto: CreateProgramDto) {
    return this.programsService.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateProgramDto) {
    return this.programsService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.programsService.remove(id);
  }
}
