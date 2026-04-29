import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateCourseDto } from "./dto/create-course.dto";
import { CreateGradeDto } from "./dto/create-grade.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";
import { RegistrarService } from "./registrar.service";

@UseGuards(JwtAuthGuard)
@Controller("registrar")
export class RegistrarController {
  constructor(private readonly registrarService: RegistrarService) {}

  @Get("courses")
  listCourses() {
    return this.registrarService.listCourses();
  }

  @Post("courses")
  createCourse(@Body() dto: CreateCourseDto) {
    return this.registrarService.createCourse(dto);
  }

  @Put("courses/:id")
  updateCourse(@Param("id") id: string, @Body() dto: UpdateCourseDto) {
    return this.registrarService.updateCourse(id, dto);
  }

  @Delete("courses/:id")
  deleteCourse(@Param("id") id: string) {
    return this.registrarService.deleteCourse(id);
  }

  @Post("grades")
  createGrade(@Body() dto: CreateGradeDto) {
    return this.registrarService.createGrade(dto);
  }

  @Get("grades/student/:studentNumber")
  getStudentGrades(@Param("studentNumber") studentNumber: string) {
    return this.registrarService.getStudentGrades(studentNumber);
  }
}
