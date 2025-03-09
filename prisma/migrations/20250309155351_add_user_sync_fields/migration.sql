/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN DEFAULT false,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "language" TEXT DEFAULT 'en-US',
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "mainApiData" JSONB,
ADD COLUMN     "role" TEXT DEFAULT 'USER',
ADD COLUMN     "timezone" TEXT DEFAULT 'UTC',
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
