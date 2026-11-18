-- Bloques en días específicos y recurrentes (aditivo: no se borra ni renombra nada).
-- "weekday" y "repeatWeekly" se quedan por compatibilidad.
ALTER TABLE "Block" ADD COLUMN     "rangeEnd" VARCHAR(10),
ADD COLUMN     "skipDates" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Los bloques que ya se repetían cada semana pasan a una serie con ese día;
-- "date" (el día en que se crearon) queda como primer día de la serie.
UPDATE "Block" SET "weekdays" = ARRAY["weekday"]::INTEGER[] WHERE "repeatWeekly" = true;
