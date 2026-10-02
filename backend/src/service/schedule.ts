import { DayOfWeek } from '@prisma/client';
import createHttpError from 'http-errors';
import { prisma } from '../prisma';

type Day = {
  dayOfWeek: DayOfWeek;
  isWorking: boolean;
  startTime: string;
  endTime: string;
};

export const createMasterSchedule = async ({
  days,
  userId,
}: {
  days: Day[];
  userId: number;
}) => {
  const master = await prisma.masterProfile.findUnique({
    where: {
      userId,
    },
  });

  if (!master) throw createHttpError(404, 'Master not found for this user');

  const masterId = master.id;

  const shedule = await prisma.$transaction(
    days.map((day) =>
      prisma.masterSchedule.upsert({
        where: {
          masterId_dayOfWeek: {
            masterId,
            dayOfWeek: day.dayOfWeek,
          },
        },
        update: {
          isWorking: day.isWorking,
          startTime: day.startTime,
          endTime: day.endTime,
        },
        create: {
          dayOfWeek: day.dayOfWeek,
          masterId,
          isWorking: day.isWorking,
          startTime: day.startTime,
          endTime: day.endTime,
        },
      }),
    ),
  );

  return shedule;
};
