import createHttpError from 'http-errors';
import { prisma } from '../prisma';
import { RecurrencePayload } from '../types/types';
import { generateRRuleString } from '../utils/generateRRuleString';
import { BreakType } from '@prisma/client';

export const createScheduleBreak = async ({
  payload,
  userId,
}: {
  payload: {
    startTime: string;
    endTime: string;
    type: BreakType;
    recurrenceOptions: RecurrencePayload;
  };
  userId: number;
}) => {
  const { startTime, endTime, type, recurrenceOptions } = payload;

  const master = await prisma.masterProfile.findUnique({
    where: {
      userId,
    },
  });

  if (!master) throw createHttpError(404, 'Master not found for this user');

  const recurrenceString = generateRRuleString(recurrenceOptions);

  const sheduleBreak = await prisma.scheduleBreak.create({
    data: {
      masterId: master.id,
      startTime,
      endTime,
      type,
      recurrence: recurrenceString,
    },
  });

  return sheduleBreak;
};

export const deleteScheduleBreak = async ({
  breakId,
  userId,
}: {
  breakId: string;
  userId: number;
}) => {
  const master = await prisma.masterProfile.findUnique({
    where: {
      userId,
    },
  });

  if (!master) throw createHttpError(404, 'Master not found for this user');
  const masterId = master.id;

  const scheduleBreak = await prisma.scheduleBreak.findUnique({
    where: { id: breakId },
  });

  if (!scheduleBreak) throw createHttpError(404, 'Schedule break not found');

  if (scheduleBreak.masterId !== masterId) {
    throw createHttpError(403, 'You do not have access to delete this break');
  }

  await prisma.scheduleBreak.delete({ where: { id: breakId } });

  return { success: true };
};
