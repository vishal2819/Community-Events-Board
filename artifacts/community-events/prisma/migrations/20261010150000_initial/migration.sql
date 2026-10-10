CREATE TYPE "Category" AS ENUM ('MUSIC', 'WORKSHOP', 'FOOD', 'SPORTS', 'KIDS');

CREATE TABLE "User" (
  "id" UUID NOT NULL PRIMARY KEY,
  "email" VARCHAR(254) NOT NULL,
  "passwordHash" VARCHAR(100) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "User_email_normalized" CHECK ("email" = lower(trim("email")))
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Event" (
  "id" UUID NOT NULL PRIMARY KEY,
  "title" VARCHAR(120) NOT NULL,
  "category" "Category" NOT NULL,
  "city" VARCHAR(80) NOT NULL,
  "startsAt" TIMESTAMPTZ(3) NOT NULL,
  "price" DECIMAL(10,2) NOT NULL CHECK ("price" >= 0),
  "description" VARCHAR(4000) NOT NULL,
  "imageUrl" VARCHAR(2048),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "Event_isActive_startsAt_id_idx" ON "Event"("isActive", "startsAt", "id");
CREATE INDEX "Event_category_isActive_startsAt_idx" ON "Event"("category", "isActive", "startsAt");

CREATE TABLE "FavouriteCategory" (
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "category" "Category" NOT NULL,
  PRIMARY KEY ("userId", "category")
);
CREATE TABLE "EventReminder" (
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "eventId" UUID NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "eventId")
);
CREATE INDEX "EventReminder_eventId_idx" ON "EventReminder"("eventId");
CREATE TABLE "EventCardDesign" (
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "eventId" UUID NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "theme" VARCHAR(32) NOT NULL CHECK ("theme" IN ('warm-atelier', 'midnight-indigo', 'botanical')),
  "stickers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  PRIMARY KEY ("userId", "eventId"),
  CONSTRAINT "EventCardDesign_stickers_allowed" CHECK (
    cardinality("stickers") <= 3 AND "stickers" <@ ARRAY['vinyl', 'coldbrew', 'spark', 'flower', 'ticket']::TEXT[]
  )
);
CREATE INDEX "EventCardDesign_eventId_idx" ON "EventCardDesign"("eventId");
