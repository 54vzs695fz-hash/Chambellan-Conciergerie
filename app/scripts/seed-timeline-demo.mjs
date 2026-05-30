#!/usr/bin/env node
/** Seed one trip with afternoon + evening activities for PDF timeline testing. */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const directUrl =
  process.env.POSTGRES_URL ??
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL;

if (!directUrl) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: directUrl,
    ssl: directUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
  }),
});

async function main() {
  const trip = await prisma.trip.create({
    data: {
      client_name: "Timeline Test",
      destination: "MYKONOS",
      arrival_date: "2026-06-01",
      departure_date: "2026-06-03",
    },
  });

  for (const date of ["2026-06-01", "2026-06-02", "2026-06-03"]) {
    const day = await prisma.tripDay.create({
      data: {
        trip_id: trip.id,
        date,
        sections: JSON.stringify([
          { id: "afternoon", label: "Afternoon", sort_order: 0 },
          { id: "evening", label: "Evening / Night", sort_order: 1 },
        ]),
      },
    });

    await prisma.activity.createMany({
      data: [
        {
          trip_day_id: day.id,
          period: "afternoon",
          activity_type: "beach_club",
          time: "15:30",
          title: "Shellona",
          sort_order: 0,
        },
        {
          trip_day_id: day.id,
          period: "evening",
          activity_type: "restaurant",
          time: "22:00",
          title: "Gaia",
          sort_order: 0,
        },
      ],
    });
  }

  console.log(trip.id);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
