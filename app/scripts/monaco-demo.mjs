/**
 * Temporary Monaco GP demo data for layout/PDF testing (trip id 4).
 * Usage:
 *   node scripts/monaco-demo.mjs populate   — backup + fill demo content
 *   node scripts/monaco-demo.mjs restore    — restore from backup
 *   node scripts/monaco-demo.mjs verify     — print trip summary
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DB_PATH = path.join(ROOT, "data", "chambellan.db");
const BACKUP_PATH = path.join(ROOT, ".backup", "trip-4-pre-demo.json");
const TRIP_ID = 4;

const DEMO_ARRANGEMENTS = {
  hotel: "Hôtel de Paris Monte-Carlo",
  restaurant_reservations: "Confirmed",
  club_reservations: "Confirmed",
  driver_name: "Jean Dupont",
  driver_phone: "+33 6 12 34 56 78",
  butler_name: "Pierre Martin",
  butler_phone: "+33 6 98 76 54 32",
  security_contact: "Securitas Monaco",
  emergency_contact: "+33 6 00 00 00 00",
};

/** @type {Record<string, { sections: { label: string; activities: { title: string; time: string; details?: string; type: string }[] }[] }>} */
const DEMO_DAYS = {
  "2026-05-28": {
    sections: [
      {
        label: "Lunch",
        activities: [
          {
            title: "Amazonico Monaco",
            time: "13:00",
            details: "Reservation confirmed for 4 guests",
            type: "restaurant",
          },
        ],
      },
      {
        label: "Dinner",
        activities: [
          {
            title: "Sass Café",
            time: "21:00",
            details: "VIP table confirmed",
            type: "restaurant",
          },
        ],
      },
      {
        label: "Club",
        activities: [
          {
            title: "Lilly's Club",
            time: "00:30",
            details: "Guest list confirmed",
            type: "club",
          },
        ],
      },
    ],
  },
  "2026-05-29": {
    sections: [
      {
        label: "Lunch",
        activities: [
          { title: "La Môme Monaco", time: "13:00", type: "restaurant" },
        ],
      },
      {
        label: "Paddock",
        activities: [
          {
            title: "Formula 1 Paddock Club",
            time: "15:00",
            type: "activity",
          },
        ],
      },
      {
        label: "Dinner",
        activities: [
          { title: "Cipriani Monaco", time: "21:00", type: "restaurant" },
        ],
      },
      {
        label: "Club",
        activities: [
          { title: "Jimmy'z Monaco", time: "00:30", type: "club" },
        ],
      },
    ],
  },
  "2026-05-30": {
    sections: [
      {
        label: "Beach Club",
        activities: [
          { title: "Maona Monte-Carlo", time: "13:00", type: "beach_club" },
        ],
      },
      {
        label: "Paddock",
        activities: [
          {
            title: "Formula 1 Paddock Club",
            time: "15:00",
            type: "activity",
          },
        ],
      },
      {
        label: "Dinner",
        activities: [
          { title: "Amazónico Monaco", time: "21:00", type: "restaurant" },
        ],
      },
      {
        label: "Club",
        activities: [
          { title: "Jimmy'z Monaco", time: "00:30", type: "club" },
        ],
      },
    ],
  },
  "2026-05-31": {
    sections: [
      {
        label: "Brunch",
        activities: [
          { title: "Café de Paris", time: "12:00", type: "restaurant" },
        ],
      },
      {
        label: "Grand Prix",
        activities: [
          {
            title: "Formula 1 Grand Prix",
            time: "14:00",
            type: "activity",
          },
        ],
      },
      {
        label: "Dinner",
        activities: [
          { title: "Coya Monaco", time: "21:00", type: "restaurant" },
        ],
      },
    ],
  },
  "2026-06-01": {
    sections: [
      {
        label: "Departure",
        activities: [
          {
            title: "Transfer to Airport",
            time: "09:00",
            type: "transfer",
          },
        ],
      },
    ],
  },
};

function openDb() {
  return new Database(DB_PATH);
}

function sectionId(date, index) {
  return `s_${date.replace(/-/g, "")}_${index}`;
}

function backupTrip(db) {
  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(TRIP_ID);
  if (!trip) throw new Error(`Trip ${TRIP_ID} not found`);

  const days = db
    .prepare("SELECT * FROM trip_days WHERE trip_id = ? ORDER BY date")
    .all(TRIP_ID);

  const activities = db
    .prepare(
      `SELECT a.* FROM activities a
       JOIN trip_days td ON a.trip_day_id = td.id
       WHERE td.trip_id = ?
       ORDER BY td.date, a.sort_order`
    )
    .all(TRIP_ID);

  const payload = { trip, days, activities, backedUpAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(BACKUP_PATH), { recursive: true });
  fs.writeFileSync(BACKUP_PATH, JSON.stringify(payload, null, 2));
  console.log(`Backup saved: ${BACKUP_PATH}`);
  return payload;
}

function populateTrip(db) {
  if (!fs.existsSync(BACKUP_PATH)) {
    backupTrip(db);
  } else {
    console.log(`Backup already exists: ${BACKUP_PATH} (skipping re-backup)`);
  }

  const days = db
    .prepare("SELECT id, date FROM trip_days WHERE trip_id = ? ORDER BY date")
    .all(TRIP_ID);

  if (!days.length) throw new Error("No trip days found");

  db.transaction(() => {
    for (const day of days) {
      db.prepare(
        `DELETE FROM activities WHERE trip_day_id = ?`
      ).run(day.id);
    }

    db.prepare(
      `UPDATE trips SET
        hotel = @hotel,
        restaurant_reservations = @restaurant_reservations,
        club_reservations = @club_reservations,
        driver_name = @driver_name,
        driver_phone = @driver_phone,
        butler_name = @butler_name,
        butler_phone = @butler_phone,
        security_contact = @security_contact,
        emergency_contact = @emergency_contact,
        updated_at = datetime('now')
       WHERE id = @id`
    ).run({ ...DEMO_ARRANGEMENTS, id: TRIP_ID });

    for (const day of days) {
      const demo = DEMO_DAYS[day.date];
      if (!demo) {
        db.prepare("UPDATE trip_days SET sections = '[]' WHERE id = ?").run(
          day.id
        );
        continue;
      }

      const sections = demo.sections.map((sec, i) => ({
        id: sectionId(day.date, i),
        label: sec.label,
        sort_order: i,
      }));

      db.prepare("UPDATE trip_days SET sections = ? WHERE id = ?").run(
        JSON.stringify(sections),
        day.id
      );

      const insertAct = db.prepare(
        `INSERT INTO activities (trip_day_id, period, activity_type, time, title, details, status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)`
      );

      demo.sections.forEach((sec, si) => {
        const periodId = sections[si].id;
        sec.activities.forEach((act, ai) => {
          insertAct.run(
            day.id,
            periodId,
            act.type,
            act.time,
            act.title,
            act.details ?? "",
            ai
          );
        });
      });
    }
  })();

  console.log(`Trip ${TRIP_ID} populated with Monaco GP demo content.`);
}

function restoreTrip(db) {
  if (!fs.existsSync(BACKUP_PATH)) {
    throw new Error(`No backup found at ${BACKUP_PATH}`);
  }
  const { trip, days, activities } = JSON.parse(
    fs.readFileSync(BACKUP_PATH, "utf8")
  );

  db.transaction(() => {
    const { id: _id, created_at: _ca, updated_at: _ua, ...tripFields } = trip;
    db.prepare(
      `UPDATE trips SET
        client_id = @client_id, client_name = @client_name,
        destination = @destination, arrival_date = @arrival_date,
        departure_date = @departure_date,
        hotel = @hotel, villa = @villa, driver = @driver, butler = @butler,
        security = @security, notes = @notes,
        driver_name = @driver_name, driver_phone = @driver_phone,
        butler_name = @butler_name, butler_phone = @butler_phone,
        security_contact = @security_contact, emergency_contact = @emergency_contact,
        yacht = @yacht, jet = @jet,
        restaurant_reservations = @restaurant_reservations,
        club_reservations = @club_reservations,
        updated_at = datetime('now')
       WHERE id = @id`
    ).run({ ...tripFields, id: TRIP_ID });

    for (const day of days) {
      db.prepare("DELETE FROM activities WHERE trip_day_id = ?").run(day.id);
      db.prepare("UPDATE trip_days SET sections = ? WHERE id = ?").run(
        day.sections ?? "[]",
        day.id
      );
    }

    const insertAct = db.prepare(
      `INSERT INTO activities (id, trip_day_id, period, activity_type, time, title, details, status, sort_order)
       VALUES (@id, @trip_day_id, @period, @activity_type, @time, @title, @details, @status, @sort_order)`
    );

    for (const act of activities) {
      insertAct.run(act);
    }

    db.prepare(
      "DELETE FROM sqlite_sequence WHERE name = 'activities' AND seq < (SELECT MAX(id) FROM activities)"
    ).run();
  })();

  console.log(`Trip ${TRIP_ID} restored from backup.`);
}

function verifyTrip(db) {
  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(TRIP_ID);
  console.log("\n=== Trip ===");
  console.log(
    `${trip.client_name} · ${trip.destination} · ${trip.arrival_date} → ${trip.departure_date}`
  );
  console.log(`Hotel: ${trip.hotel}`);
  console.log(`Restaurant: ${trip.restaurant_reservations}`);
  console.log(`Club: ${trip.club_reservations}`);
  console.log(
    `Team: ${trip.driver_name} (${trip.driver_phone}), ${trip.butler_name} (${trip.butler_phone}), ${trip.security_contact}, ${trip.emergency_contact}`
  );

  const rows = db
    .prepare(
      `SELECT td.date, td.sections, a.period, a.time, a.title, a.details
       FROM trip_days td
       LEFT JOIN activities a ON a.trip_day_id = td.id
       WHERE td.trip_id = ?
       ORDER BY td.date, a.sort_order`
    )
    .all(TRIP_ID);

  let currentDate = "";
  for (const row of rows) {
    if (row.date !== currentDate) {
      currentDate = row.date;
      const sections = JSON.parse(row.sections || "[]");
      console.log(`\n--- ${row.date} (${sections.map((s) => s.label).join(", ")}) ---`);
    }
    if (row.title) {
      console.log(
        `  ${row.time || "—"} · ${row.title}${row.details ? ` — ${row.details}` : ""}`
      );
    }
  }

  const count = db
    .prepare(
      `SELECT COUNT(*) AS n FROM activities a
       JOIN trip_days td ON a.trip_day_id = td.id WHERE td.trip_id = ?`
    )
    .get(TRIP_ID);
  console.log(`\nTotal activities: ${count.n}`);
}

const cmd = process.argv[2] || "populate";
const db = openDb();

try {
  if (cmd === "populate") populateTrip(db);
  else if (cmd === "restore") restoreTrip(db);
  else if (cmd === "verify") verifyTrip(db);
  else {
    console.error("Usage: node scripts/monaco-demo.mjs [populate|restore|verify]");
    process.exit(1);
  }
  if (cmd !== "verify") verifyTrip(db);
} finally {
  db.close();
}
