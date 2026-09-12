-- AlterTable
ALTER TABLE "YellowLabReport" ADD COLUMN     "reportPath" TEXT,
ALTER COLUMN "reportJson" DROP NOT NULL;
