import { prisma } from "../prisma";

interface ZipWithDistance {
  postalCode: string;
  distance: number;
}

export const getPostalCodesInRadius = async (
  centralZip: string,
  radiusKm: number,
): Promise<{ codes: string[]; distanceMap: Map<string, number> }> => {
  if (!radiusKm || radiusKm === 0) {
    return { codes: [centralZip], distanceMap: new Map([[centralZip, 0]]) };
  }

  const center = await prisma.zipCodeDirectory.findUnique({
    where: {
      postalCode: centralZip,
    },
  });

  if (!center) {
   return {codes: [centralZip], distanceMap: new Map([[centralZip, 0]]) };
  }

const nearbyZips = await prisma.$queryRaw<ZipWithDistance[]>`
    SELECT "postalCode",
      ( 6371 * acos( cos( radians(${center.latitude}) ) * cos( radians(latitude) ) * cos( radians(longitude) - radians(${center.longitude}) ) + sin( radians(${center.latitude}) ) * sin( radians(latitude) ) ) ) AS distance
    FROM "ZipCodeDirectory"
    WHERE "postalCode" != ${centralZip}
    HAVING distance <= ${radiusKm}
    ORDER BY distance ASC
  `;

const codes =[centralZip,...nearbyZips.map( z =>z.postalCode) ]
  const distanceMap = new Map<string, number>([[centralZip, 0]]);
  nearbyZips.forEach(z => distanceMap.set(z.postalCode, z.distance));

  return { codes, distanceMap };
}
