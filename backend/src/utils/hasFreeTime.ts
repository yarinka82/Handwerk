import { DayOfWeek } from '@prisma/client';
import { prisma } from '../prisma';
import { rrulestr } from 'rrule';

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
  const [hoursRaw, minutesRaw] = time.split(':');
  const result = new Date(baseDate);
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error('Invalid time format');
  }

  result.setHours(hours, minutes, 0, 0);
  return result;
};

export const hasFreeTime = async ({
  masterId,
  startAt,
  endAt,
  timeBlockId,
}: {
  masterId: string;
  startAt: string;
  endAt: string;
  timeBlockId?: string;
}): Promise<boolean> => {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start >= end
  ) {
    throw new Error('Invalid time range');
  }

  const dayOfWeek = getDayOfWeek(start);
  const startOfDay = new Date(start);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(start);
  endOfDay.setHours(23, 59, 59, 999);

  const schedule = await prisma.masterSchedule.findUnique({
    where: { masterId_dayOfWeek: { masterId, dayOfWeek } },
  });

  if (!schedule || !schedule.isWorking) return false;

  const workStart = parseTimeOnDate(start, schedule.startTime);
  const workEnd = parseTimeOnDate(start, schedule.endTime);

  if (start < workStart || end > workEnd) return false;

  const breaks = await prisma.scheduleBreak.findMany({
    where: {
      masterId,
    },
  });

  const overlapsBreak = breaks.some((b) => {
    const rule = rrulestr(b.recurrence);

    const breakExistsOnBookingDay =
      rule.between(startOfDay, endOfDay, true).length > 0;

    if (!breakExistsOnBookingDay) return false;

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
      ...(timeBlockId && {
        id: { not: timeBlockId },
      }),
      OR: [
        { status: 'BLOCKED' },
        { status: 'RESERVED', reservationExpiresAt: { gt: new Date() } },
      ],
    },
  });

  return !conflict;
};
