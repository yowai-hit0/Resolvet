-- CreateEnum
CREATE TYPE "public"."InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "public"."UserRole" ADD VALUE 'super_admin';

-- CreateTable
CREATE TABLE "public"."invites" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "public"."InviteStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invites_token_key" ON "public"."invites"("token");

-- CreateIndex
CREATE INDEX "invites_email_idx" ON "public"."invites"("email");
