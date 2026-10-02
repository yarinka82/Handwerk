import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';

export const createTimeBlock = async (
  payload: Prisma.TimeBlockCreateInput ) => {

  const timeBlock = await prisma.timeBlock.create({
    data: payload,
  });

  return timeBlock;
};

export const updateTimeBlock = async (payload: Prisma.TimeBlockCreateInput) => {

  return timeBlock = await prisma.timeBlock.update({

  })
}
