-- AlterTable
ALTER TABLE "Student"
ADD COLUMN "phone" TEXT,
ADD COLUMN "admissionYear" INTEGER;

-- CreateIndex
CREATE INDEX "Student_phone_idx" ON "Student"("phone");

-- CreateIndex
CREATE INDEX "Student_studentNumber_lastName_idx" ON "Student"("studentNumber", "lastName");
