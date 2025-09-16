-- CreateEnum
CREATE TYPE "WORKSPACE_PURPOSE" AS ENUM ('HEALTH_CARE', 'E_COMMERCE', 'GOVERNMENT', 'ACCOUNTING', 'MARKETING', 'EDUCATION', 'FINANCE', 'ENTERTAINMENT', 'TECHNOLOGY', 'REAL_ESTATE', 'TRAVEL', 'FOOD_BEVERAGE', 'NON_PROFIT', 'SPORTS', 'DEFAULT', 'OTHER');

-- CreateEnum
CREATE TYPE "DATA_SOURCE_TYPE" AS ENUM ('POSTGRESQL', 'MYSQL');

-- CreateEnum
CREATE TYPE "GRAPH_TYPE" AS ENUM ('BAR_CHART', 'LINE_CHART');

-- CreateEnum
CREATE TYPE "USER_REQUEST_STATUS" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "INGESTION_STATUS" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
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
CREATE TABLE "workspaces" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "purpose" "WORKSPACE_PURPOSE" NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_data_sources" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "type" "DATA_SOURCE_TYPE" NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "USER_REQUEST_STATUS" NOT NULL,
    "graph_type" "GRAPH_TYPE",
    "sql_script" TEXT,
    "result_text" TEXT,
    "result_table" JSONB,
    "graph_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_tables" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "schema_name" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "business_name" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_columns" (
    "id" SERIAL NOT NULL,
    "table_id" INTEGER NOT NULL,
    "column_name" TEXT NOT NULL,
    "data_type" TEXT NOT NULL,
    "is_nullable" BOOLEAN NOT NULL DEFAULT true,
    "is_primary_key" BOOLEAN NOT NULL DEFAULT false,
    "is_foreign_key" BOOLEAN NOT NULL DEFAULT false,
    "business_name" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foreign_keys" (
    "id" SERIAL NOT NULL,
    "from_table_id" INTEGER NOT NULL,
    "from_column_id" INTEGER NOT NULL,
    "to_table_id" INTEGER NOT NULL,
    "to_column_id" INTEGER NOT NULL,
    "constraint_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "foreign_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_ingestions" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "status" "INGESTION_STATUS" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "workspace_ingestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_otp_requests_user_id_key" ON "users_otp_requests"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_sessions_user_id_key" ON "users_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_sessions_token_key" ON "users_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_table_per_workspace" ON "data_tables"("workspace_id", "schema_name", "table_name");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_column_per_table" ON "data_columns"("table_id", "column_name");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_fk_from_column" ON "foreign_keys"("from_column_id");

-- CreateIndex
CREATE INDEX "idx_ingestion_workspace" ON "workspace_ingestions"("workspace_id");

-- AddForeignKey
ALTER TABLE "users_otp_requests" ADD CONSTRAINT "users_otp_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_data_sources" ADD CONSTRAINT "workspace_data_sources_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_requests" ADD CONSTRAINT "user_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_requests" ADD CONSTRAINT "user_requests_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_tables" ADD CONSTRAINT "data_tables_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_columns" ADD CONSTRAINT "data_columns_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "data_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foreign_keys" ADD CONSTRAINT "foreign_keys_from_table_id_fkey" FOREIGN KEY ("from_table_id") REFERENCES "data_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foreign_keys" ADD CONSTRAINT "foreign_keys_from_column_id_fkey" FOREIGN KEY ("from_column_id") REFERENCES "data_columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foreign_keys" ADD CONSTRAINT "foreign_keys_to_table_id_fkey" FOREIGN KEY ("to_table_id") REFERENCES "data_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foreign_keys" ADD CONSTRAINT "foreign_keys_to_column_id_fkey" FOREIGN KEY ("to_column_id") REFERENCES "data_columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_ingestions" ADD CONSTRAINT "workspace_ingestions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
