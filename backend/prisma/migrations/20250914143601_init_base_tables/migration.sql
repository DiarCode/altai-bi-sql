-- CreateEnum
CREATE TYPE "SERVICE_TYPE" AS ENUM ('REPAIR', 'MAINTENANCE', 'WASHING', 'TIRE_SERVICE', 'DIAGNOSTICS', 'OTHER');

-- CreateEnum
CREATE TYPE "CarStatus" AS ENUM ('EXCELLENT', 'COSMETIC_ISSUES', 'MECHANICAL_SERVICE_NEEDED', 'CRITICAL_CONDITION');

-- CreateEnum
CREATE TYPE "URGENCY" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "IMPORTANCE" AS ENUM ('CRITICAL', 'MODERATE', 'MINOR');

-- CreateTable
CREATE TABLE "CarAnalysis" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "carModel" TEXT NOT NULL,
    "carYear" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalEstimatedCost" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "status" "CarStatus" NOT NULL DEFAULT 'EXCELLENT',
    "summary" TEXT NOT NULL,

    CONSTRAINT "CarAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarAnalysisZone" (
    "id" SERIAL NOT NULL,
    "analysisId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "breaking" BOOLEAN NOT NULL,
    "hasRust" BOOLEAN NOT NULL,
    "isDirty" BOOLEAN NOT NULL,
    "importance" "IMPORTANCE" NOT NULL,
    "consequences" TEXT[],
    "estimatedCost" INTEGER NOT NULL,
    "urgency" "URGENCY" NOT NULL,
    "timeToFix" TEXT NOT NULL,

    CONSTRAINT "CarAnalysisZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "car_model" TEXT,
    "car_year" INTEGER,
    "car_color" TEXT,
    "vin_number" TEXT,
    "city" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users_otp_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "phone_number" TEXT NOT NULL,
    "otp_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_otp_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indrive_partners" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "description" TEXT,
    "service_type" "SERVICE_TYPE" NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviews_count" INTEGER NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indrive_partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_otp_requests_user_id_key" ON "users_otp_requests"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_sessions_user_id_key" ON "users_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_sessions_token_key" ON "users_sessions"("token");

-- AddForeignKey
ALTER TABLE "CarAnalysis" ADD CONSTRAINT "CarAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarAnalysisZone" ADD CONSTRAINT "CarAnalysisZone_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "CarAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_otp_requests" ADD CONSTRAINT "users_otp_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
