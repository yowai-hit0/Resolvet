/*
  Warnings:

  - Added the required column `requester_phone` to the `tickets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."tickets" ADD COLUMN     "location" TEXT,
ADD COLUMN     "requester_phone" TEXT NOT NULL,
ALTER COLUMN "requester_email" DROP NOT NULL;
