import { PrismaClient, RoleStatus, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const role = await prisma.role.upsert({
    where: { code: "SUPER_ADMIN" },
    update: {
      name: "Super Admin",
      description: "System-level administrator for SAR",
      status: RoleStatus.ACTIVE,
    },
    create: {
      code: "SUPER_ADMIN",
      name: "Super Admin",
      description: "System-level administrator for SAR",
      status: RoleStatus.ACTIVE,
    },
  });

  const passwordHash = await bcrypt.hash("Admin123!", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@sar.local" },
    update: {
      firstName: "System",
      lastName: "Administrator",
      passwordHash,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: "admin@sar.local",
      firstName: "System",
      lastName: "Administrator",
      passwordHash,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log("Seed complete: admin@sar.local / Admin123! with SUPER_ADMIN role");
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
