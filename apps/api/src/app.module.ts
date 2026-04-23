import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { AuditModule } from "./audit/audit.module";
import { DepartmentsModule } from "./departments/departments.module";
import { FinanceModule } from "./finance/finance.module";
import { ImportsModule } from "./imports/imports.module";
import { PrismaModule } from "./common/prisma/prisma.module";
import { ProgramsModule } from "./programs/programs.module";
import { RegistrarModule } from "./registrar/registrar.module";
import { RolesModule } from "./roles/roles.module";
import { StudentsModule } from "./students/students.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env"],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    DepartmentsModule,
    ProgramsModule,
    StudentsModule,
    FinanceModule,
    RegistrarModule,
    ImportsModule,
    AuditModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
