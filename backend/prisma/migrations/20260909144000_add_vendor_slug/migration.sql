-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN "slug" TEXT;

-- Backfill existing vendors deterministically
UPDATE "Vendor" SET "slug" = 'kashmir-saffron-heritage-artisans' WHERE "id" = 'cmtsunogt0008vk3gdea8ow6c';
UPDATE "Vendor" SET "slug" = 'pahadi-amrut-forest-collective' WHERE "id" = 'cmtsunozo0009vk3gxx9hidfy';

-- Enforce non-null
ALTER TABLE "Vendor" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_slug_key" ON "Vendor"("slug");
