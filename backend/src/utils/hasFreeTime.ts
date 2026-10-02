import { DayOfWeek } from '@prisma/client';
import { prisma } from '../prisma';

export const getDayOfWeek = (date: Date): DayOfWeek => {
  const dayMap: Record<number, DayOfWeek> = {
    0: 'SUNDAY',
    1: 'MONDAY',
    2: 'TUESDAY',
    3: 'WEDNESDAY',
    4: 'THURSDAY',
    5: 'FRIDAY',
    6: 'SATURDAY',
  };
  return dayMap[date.getDay()] as DayOfWeek;
};

const parseTimeOnDate = (baseDate: Date, time: string): Date => {
  const [hoursRaw, minutesRaw] = time.split(':').map(Number);
  const result = new Date(baseDate);
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error('Invalid time format');
  }

  result.setHours(hours, minutes, 0, 0);
  return result;
};

export const hasFreeTime = async ({
  masterId,
  startAt,
  endAt,
}: {
  masterId: number;
  startAt: string;
  endAt: string;
}): Promise<boolean> => {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const dayOfWeek = getDayOfWeek(start);

  const schedule = await prisma.masterSchedule.findUnique({
    where: { masterId_dayOfWeek: { masterId, dayOfWeek } },
    include: { breaks: true },
  });

  if (!schedule || !schedule.isWorking) return false;

  const workStart = parseTimeOnDate(start, schedule.startTime);
  const workEnd = parseTimeOnDate(start, schedule.endTime);

  if (start < workStart || end > workEnd) return false;

  const overlapsBreak = schedule.breaks.some((b) => {
    const breakStart = parseTimeOnDate(start, b.startTime);
    const breakEnd = parseTimeOnDate(start, b.endTime);
    return start < breakEnd && end > breakStart;
  });
  if (overlapsBreak) return false;

  const conflict = await prisma.timeBlock.findFirst({
    where: {
      masterId,
      startAt: { lt: end },
      endAt: { gt: start },
      OR: [
        { status: 'BLOCKED' },
        { status: 'RESERVED', reservationExpiresAt: { gt: new Date() } },
      ],
    },
  });

  return !conflict;
};
