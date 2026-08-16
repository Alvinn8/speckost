-- CreateTable
CREATE TABLE "PersonGroup" (
    "id" SERIAL NOT NULL,
    "svName" TEXT NOT NULL,
    "enName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PersonToPersonGroup" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_PersonToPersonGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SubGroups" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_SubGroups_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PersonToPersonGroup_B_index" ON "_PersonToPersonGroup"("B");

-- CreateIndex
CREATE INDEX "_SubGroups_B_index" ON "_SubGroups"("B");

-- AddForeignKey
ALTER TABLE "_PersonToPersonGroup" ADD CONSTRAINT "_PersonToPersonGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PersonToPersonGroup" ADD CONSTRAINT "_PersonToPersonGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "PersonGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubGroups" ADD CONSTRAINT "_SubGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "PersonGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubGroups" ADD CONSTRAINT "_SubGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "PersonGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
