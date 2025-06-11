-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT,
    "role" TEXT DEFAULT 'USER',
    "emailVerified" BOOLEAN DEFAULT false,
    "image" TEXT,
    "lastLogin" DATETIME,
    "language" TEXT DEFAULT 'en-US',
    "timezone" TEXT DEFAULT 'UTC',
    "mainApiData" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastSyncedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "theme" TEXT DEFAULT 'system',
    "fontSize" TEXT DEFAULT 'medium',
    "messageStyle" TEXT DEFAULT 'bubbles',
    "animationsEnabled" BOOLEAN DEFAULT true,
    "codeTheme" TEXT DEFAULT 'github',
    "syntaxHighlighting" BOOLEAN DEFAULT true,
    "defaultModel" TEXT DEFAULT '',
    "defaultSearch" BOOLEAN DEFAULT false,
    "defaultReasoning" BOOLEAN DEFAULT false,
    "codeExecution" BOOLEAN DEFAULT true,
    "responseCreativity" INTEGER DEFAULT 70,
    "contextLength" TEXT DEFAULT 'medium',
    "streamingResponses" BOOLEAN DEFAULT true,
    "notificationsEnabled" BOOLEAN DEFAULT true,
    "soundEnabled" BOOLEAN DEFAULT true,
    "desktopNotifications" BOOLEAN DEFAULT false,
    "notificationLevel" TEXT DEFAULT 'all',
    "highContrastMode" BOOLEAN DEFAULT false,
    "reducedMotion" BOOLEAN DEFAULT false,
    "keyboardShortcuts" BOOLEAN DEFAULT true,
    "textToSpeechVoice" TEXT DEFAULT 'default',
    "autoDeleteMessages" BOOLEAN DEFAULT false,
    "autoDeletePeriod" TEXT DEFAULT '30',
    "storageLimit" TEXT DEFAULT 'unlimited',
    "exportFormat" TEXT DEFAULT 'json',
    "safeSearch" BOOLEAN DEFAULT true,
    "searchEngine" TEXT DEFAULT 'duckduckgo',
    "searchResultCount" INTEGER DEFAULT 3,
    "contentFilterLevel" TEXT DEFAULT 'moderate',
    "blockUntrustedSources" BOOLEAN DEFAULT true,
    "ipRestriction" BOOLEAN DEFAULT false,
    "allowedIps" TEXT DEFAULT '',
    "dataCollection" BOOLEAN DEFAULT true,
    "thirdPartyIntegrations" BOOLEAN DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProjectFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
