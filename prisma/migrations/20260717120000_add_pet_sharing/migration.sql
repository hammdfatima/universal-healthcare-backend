CREATE TABLE "PetShare" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "granteeUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PetShare_petId_granteeUserId_key"
ON "PetShare"("petId", "granteeUserId");

CREATE INDEX "PetShare_petId_idx" ON "PetShare"("petId");
CREATE INDEX "PetShare_granteeUserId_idx" ON "PetShare"("granteeUserId");

ALTER TABLE "PetShare"
ADD CONSTRAINT "PetShare_petId_fkey"
FOREIGN KEY ("petId") REFERENCES "Pet"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PetShare"
ADD CONSTRAINT "PetShare_granteeUserId_fkey"
FOREIGN KEY ("granteeUserId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
