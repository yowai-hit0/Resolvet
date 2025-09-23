/*
  Warnings:

  - The values [new,open,resolved,closed] on the enum `TicketStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."TicketStatus_new" AS ENUM ('New', 'Assigned', 'In_Progress', 'On_Hold', 'Resolved', 'Closed', 'Reopened');
ALTER TABLE "public"."tickets" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."tickets" ALTER COLUMN "status" TYPE "public"."TicketStatus_new" USING ("status"::text::"public"."TicketStatus_new");
ALTER TYPE "public"."TicketStatus" RENAME TO "TicketStatus_old";
ALTER TYPE "public"."TicketStatus_new" RENAME TO "TicketStatus";
DROP TYPE "public"."TicketStatus_old";
ALTER TABLE "public"."tickets" ALTER COLUMN "status" SET DEFAULT 'New';
COMMIT;

-- AlterTable
ALTER TABLE "public"."tickets" ALTER COLUMN "status" SET DEFAULT 'New';
