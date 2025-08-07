/*
  Warnings:

  - A unique constraint covering the columns `[documentNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('CONSTANCIA', 'RESOLUCION', 'UNAMAD', 'DPSEC');

-- CreateEnum
CREATE TYPE "public"."TipoResolucion" AS ENUM ('APROBACION_PROYECTO', 'APROBACION_INFORME_FINAL');

-- CreateEnum
CREATE TYPE "public"."ModalidadResolucion" AS ENUM ('DOCENTES', 'ESTUDIANTES', 'VOLUNTARIADO', 'ACTIVIDAD');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "documentType" TEXT,
ADD COLUMN     "resetPasswordExpires" TIMESTAMP(3),
ADD COLUMN     "resetPasswordToken" TEXT,
ADD COLUMN     "sex" TEXT,
ALTER COLUMN "enrollmentDate" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "public"."Constancia" (
    "id" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "constanciaNumber" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "observation" TEXT,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "fileMimeType" TEXT,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "type" "public"."DocumentType" NOT NULL DEFAULT 'CONSTANCIA',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "Constancia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Facultad" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facultad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Departamento" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "facultadId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Resolucion" (
    "id" TEXT NOT NULL,
    "tipoResolucion" "public"."TipoResolucion" NOT NULL,
    "numeroResolucion" TEXT NOT NULL,
    "fechaResolucion" TIMESTAMP(3) NOT NULL,
    "modalidad" "public"."ModalidadResolucion" NOT NULL,
    "esFinanciado" BOOLEAN NOT NULL DEFAULT false,
    "monto" DECIMAL(10,2),
    "dniAsesor" TEXT NOT NULL,
    "nombreAsesor" TEXT NOT NULL,
    "tituloProyecto" TEXT NOT NULL,
    "facultadId" INTEGER NOT NULL,
    "departamentoId" INTEGER NOT NULL,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "fileMimeType" TEXT,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "Resolucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocenteResolucion" (
    "id" TEXT NOT NULL,
    "resolucionId" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "email" TEXT,
    "facultad" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocenteResolucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EstudianteResolucion" (
    "id" TEXT NOT NULL,
    "resolucionId" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstudianteResolucion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Constancia_constanciaNumber_key" ON "public"."Constancia"("constanciaNumber");

-- CreateIndex
CREATE INDEX "Constancia_studentCode_idx" ON "public"."Constancia"("studentCode");

-- CreateIndex
CREATE INDEX "Constancia_dni_idx" ON "public"."Constancia"("dni");

-- CreateIndex
CREATE INDEX "Constancia_constanciaNumber_idx" ON "public"."Constancia"("constanciaNumber");

-- CreateIndex
CREATE INDEX "Constancia_year_idx" ON "public"."Constancia"("year");

-- CreateIndex
CREATE INDEX "Constancia_status_idx" ON "public"."Constancia"("status");

-- CreateIndex
CREATE INDEX "Constancia_createdById_idx" ON "public"."Constancia"("createdById");

-- CreateIndex
CREATE INDEX "Constancia_createdAt_idx" ON "public"."Constancia"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Facultad_nombre_key" ON "public"."Facultad"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Facultad_codigo_key" ON "public"."Facultad"("codigo");

-- CreateIndex
CREATE INDEX "Facultad_nombre_idx" ON "public"."Facultad"("nombre");

-- CreateIndex
CREATE INDEX "Departamento_facultadId_idx" ON "public"."Departamento"("facultadId");

-- CreateIndex
CREATE UNIQUE INDEX "Departamento_nombre_facultadId_key" ON "public"."Departamento"("nombre", "facultadId");

-- CreateIndex
CREATE UNIQUE INDEX "Resolucion_numeroResolucion_key" ON "public"."Resolucion"("numeroResolucion");

-- CreateIndex
CREATE INDEX "Resolucion_numeroResolucion_idx" ON "public"."Resolucion"("numeroResolucion");

-- CreateIndex
CREATE INDEX "Resolucion_tipoResolucion_idx" ON "public"."Resolucion"("tipoResolucion");

-- CreateIndex
CREATE INDEX "Resolucion_modalidad_idx" ON "public"."Resolucion"("modalidad");

-- CreateIndex
CREATE INDEX "Resolucion_fechaResolucion_idx" ON "public"."Resolucion"("fechaResolucion");

-- CreateIndex
CREATE INDEX "Resolucion_status_idx" ON "public"."Resolucion"("status");

-- CreateIndex
CREATE INDEX "Resolucion_facultadId_idx" ON "public"."Resolucion"("facultadId");

-- CreateIndex
CREATE INDEX "Resolucion_departamentoId_idx" ON "public"."Resolucion"("departamentoId");

-- CreateIndex
CREATE INDEX "Resolucion_createdById_idx" ON "public"."Resolucion"("createdById");

-- CreateIndex
CREATE INDEX "Resolucion_createdAt_idx" ON "public"."Resolucion"("createdAt");

-- CreateIndex
CREATE INDEX "DocenteResolucion_resolucionId_idx" ON "public"."DocenteResolucion"("resolucionId");

-- CreateIndex
CREATE UNIQUE INDEX "DocenteResolucion_resolucionId_dni_key" ON "public"."DocenteResolucion"("resolucionId", "dni");

-- CreateIndex
CREATE INDEX "EstudianteResolucion_resolucionId_idx" ON "public"."EstudianteResolucion"("resolucionId");

-- CreateIndex
CREATE UNIQUE INDEX "EstudianteResolucion_resolucionId_codigo_key" ON "public"."EstudianteResolucion"("resolucionId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "User_documentNumber_key" ON "public"."User"("documentNumber");

-- CreateIndex
CREATE INDEX "User_documentNumber_idx" ON "public"."User"("documentNumber");

-- AddForeignKey
ALTER TABLE "public"."Constancia" ADD CONSTRAINT "Constancia_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Constancia" ADD CONSTRAINT "Constancia_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Departamento" ADD CONSTRAINT "Departamento_facultadId_fkey" FOREIGN KEY ("facultadId") REFERENCES "public"."Facultad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resolucion" ADD CONSTRAINT "Resolucion_facultadId_fkey" FOREIGN KEY ("facultadId") REFERENCES "public"."Facultad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resolucion" ADD CONSTRAINT "Resolucion_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "public"."Departamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resolucion" ADD CONSTRAINT "Resolucion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resolucion" ADD CONSTRAINT "Resolucion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocenteResolucion" ADD CONSTRAINT "DocenteResolucion_resolucionId_fkey" FOREIGN KEY ("resolucionId") REFERENCES "public"."Resolucion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EstudianteResolucion" ADD CONSTRAINT "EstudianteResolucion_resolucionId_fkey" FOREIGN KEY ("resolucionId") REFERENCES "public"."Resolucion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
