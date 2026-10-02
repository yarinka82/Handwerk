import { MasterProfile, Prisma } from '@prisma/client';
import createHttpError from 'http-errors';
import { deleteFileFromCloudinary } from '../utils/cloudinary';
import {  MasterSearchFilters, MasterSearchRow } from '../types/types';
import { prisma } from '../prisma';
import { getDayOfWeek } from '../utils/hasFreeTime';

type DocumentInput = Prisma.MasterDocumentCreateWithoutMasterInput;

type MasterProfileCreateInput = Omit<MasterProfile, 'id'> & {
  documents?: DocumentInput[];
};

export const registrationMaster = async (
  masterProfile: MasterProfileCreateInput,
) => {
  if (masterProfile.agreedToTerms !== true) {
    throw createHttpError(400, 'Sie müssen den Nutzungsbedingungen zustimmen');
  }

  const { documents, ...profileDate } = masterProfile;

  const data = {
    ...profileDate,
    agreedToTerms: true,
    dateAgreeToTerms: new Date(),
    isActive: true,
    documents:
      documents && documents.length > 0
        ? {
            createMany: {
              data: documents,
            },
          }
        : {},
  };

  const master = await prisma.masterProfile.create({
    data,
    include: {
      documents: true,
    },
  });

  return master;
};

export const changeMasterProfile = async ({
  userId,
  updateMasterProfile,
  documentsToDelete,
  newDocuments,
}: {
  userId: number;
  updateMasterProfile: Prisma.MasterProfileUpdateInput;
  documentsToDelete?: string[];
  newDocuments?: Prisma.MasterDocumentCreateWithoutMasterInput[];
}) => {
  const { agreedToTerms: _, ...updateData } = updateMasterProfile;

  return await prisma.$transaction(async (tx) => {
    const master = await tx.masterProfile.findUnique({
      where: {
        userId,
      },
    });

    if (!master)
      throw createHttpError(404, 'Not profile master for current user');

    if (
      master.photoPublicId &&
      updateData.photoUrl &&
      updateData.photoUrl !== master.photoUrl
    ) {
      await deleteFileFromCloudinary(master.photoPublicId, 'image/jpeg');
    }

    if (documentsToDelete && documentsToDelete.length > 0) {
      const dbDocumentDelete = await tx.masterDocument.findMany({
        where: {
          masterId: master.id,
          filePublicId: { in: documentsToDelete },
        },
      });

      for (const doc of dbDocumentDelete) {
        await deleteFileFromCloudinary(doc.filePublicId, doc.mimeType);
      }
    }

if (documentsToDelete) {
    await tx.masterDocument.deleteMany({
      where: {
        masterId: master.id,
        filePublicId: {
          in: documentsToDelete,
        },
      },
    });
}
    const data = {
      ...updateData,
      documents:
        newDocuments && newDocuments.length > 0
          ? {
              createMany: {
                data: newDocuments,
              },
            }
          : {},
    };

    const updateMaster = await prisma.masterProfile.update({
      where: {
        userId,
      },
      data,
      include: {
        documents: true,
      },
    });
    return updateMaster;
  });
};

export const getMasterProfile = async (userId: number) => {
  const master = await prisma.masterProfile.findUnique({
    where: {
      userId,
    },
  });
  if (!master) return null;
  return master;
};


  const geocodePostalCode = async (postalCode: string) => {
    const origin = await prisma.zipCodeDirectory.findUnique({
      where: {
        postalCode,
      },
    });
    if (!origin)
      throw createHttpError(404, 'Zip code not found or not supported');

    return origin;
  };

export const searchMasters = async (filters: MasterSearchFilters) => {
  const {
    category,
    postalCode,
    radiusKm = 15,
    minPrice,
    maxPrice,
    minRating,
    startAt,
    endAt,
    sortBy = 'rating',
    sortDirection = 'desc',
    limit = 20,
    offset = 0,
  } = filters;

  const hasTimeFilter = Boolean(startAt && endAt);
  const dayOfWeek = hasTimeFilter ? getDayOfWeek(new Date(startAt!)) : null;
  const start = hasTimeFilter ? new Date(startAt!) : null;
  const end = hasTimeFilter ? new Date(endAt!) : null;

  const origin = postalCode ? await geocodePostalCode(postalCode) : null;

  const latDelta = origin ? radiusKm / 111 : null;
  const lngDelta = origin
    ? radiusKm / (111 * Math.cos((origin.latitude * Math.PI) / 180))
    : null;

  const baseFilters = Prisma.sql`
    WHERE m.speciality = ${category}::"MasterSpecialty"
      AND m."isActive" = true
      ${minRating ? Prisma.sql`AND m.rating >= ${minRating}` : Prisma.empty}
      ${minPrice ? Prisma.sql`AND m."maxPrice" >= ${minPrice}` : Prisma.empty}
      ${maxPrice ? Prisma.sql`AND m."minPrice" <= ${maxPrice}` : Prisma.empty}
  `;

  const geoJoinAndFilter = origin
    ? Prisma.sql`
      INNER JOIN "ServiceArea" sa ON sa."masterId" = m.id
        AND sa.latitude  BETWEEN ${origin.latitude - latDelta!} AND ${origin.latitude + latDelta!}
        AND sa.longitude BETWEEN ${origin.longitude - lngDelta!} AND ${origin.longitude + lngDelta!}
    `
    : Prisma.empty;

  const geoHaving = origin
    ? Prisma.sql`
      AND (
        6371 * acos(
          cos(radians(${origin.latitude})) * cos(radians(sa.latitude)) *
          cos(radians(sa.longitude) - radians(${origin.longitude})) +
          sin(radians(${origin.latitude})) * sin(radians(sa.latitude))
        )
      ) <= LEAST(sa.radius, ${radiusKm})
    `
    : Prisma.empty;

  const timeFilter = hasTimeFilter
    ? Prisma.sql`
      AND EXISTS (
        SELECT 1 FROM "MasterSchedule" ms
        WHERE ms."masterId" = m.id
          AND ms."dayOfWeek" = ${dayOfWeek}::"DayOfWeek"
          AND ms."isWorking" = true
          AND ${start}::time >= ms."startTime"::time
          AND ${end}::time   <= ms."endTime"::time
          AND NOT EXISTS (
            SELECT 1 FROM "ScheduleBreak" sb
            WHERE sb."scheduleId" = ms.id
              AND ${start}::time < sb."endTime"::time
              AND ${end}::time   > sb."startTime"::time
          )
      )
      AND NOT EXISTS (
        SELECT 1 FROM "TimeBlock" tb
        WHERE tb."masterId" = m.id
          AND tb.status IN ('RESERVED', 'BLOCKED')
          AND (tb.status = 'BLOCKED' OR tb."reservationExpiresAt" > now())
          AND tstzrange(tb."startAt", tb."endAt", '[)') && tstzrange(${start}, ${end}, '[)')
      )
    `
    : Prisma.empty;


  const countResult = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT m.id) AS count
    FROM "MasterProfile" m
    ${geoJoinAndFilter}
    ${baseFilters}
    ${geoHaving}
    ${timeFilter}
  `;
  const totalCount = Number(countResult[0]?.count ?? 0);


  let orderByClause: Prisma.Sql;
  if (sortBy === 'distance' && origin) {
    orderByClause = Prisma.sql`distance_km ${Prisma.raw(sortDirection)} NULLS LAST`;
  } else if (sortBy === 'price') {
    orderByClause = Prisma.sql`m."minPrice" ${Prisma.raw(sortDirection)} NULLS LAST`;
  } else {
    orderByClause = Prisma.sql`m.rating ${Prisma.raw(sortDirection)} NULLS LAST, u.name ASC`;
  }

  const distanceSelect = origin
    ? Prisma.sql`,
      (
        6371 * acos(
          cos(radians(${origin.latitude})) * cos(radians(sa.latitude)) *
          cos(radians(sa.longitude) - radians(${origin.longitude})) +
          sin(radians(${origin.latitude})) * sin(radians(sa.latitude))
        )
      ) AS distance_km`
    : Prisma.sql`, NULL AS distance_km`;

  const masters = await prisma.$queryRaw<MasterSearchRow[]>`
    SELECT DISTINCT m.id, m."userId", m.speciality, m.rating, m."minPrice", m."maxPrice",
           u.name
           ${distanceSelect}
    FROM "MasterProfile" m
    INNER JOIN "User" u ON u.id = m."userId"
    ${geoJoinAndFilter}
    ${baseFilters}
    ${geoHaving}
    ${timeFilter}
    ORDER BY ${orderByClause}
    LIMIT ${limit} OFFSET ${offset}
  `;

  return {
    masters,
    meta: {
      totalCount,
      limit,
      offset,
      hasNextPage: offset + limit < totalCount,
    },
  };
};
