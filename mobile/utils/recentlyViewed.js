import * as SQLite from 'expo-sqlite';

let db = null;

async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('mioto.db');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recently_viewed (
        id TEXT PRIMARY KEY,
        brand TEXT,
        model TEXT,
        year INTEGER,
        cover_image TEXT,
        price_per_day REAL,
        location TEXT,
        viewed_at INTEGER
      );
    `);
  }
  return db;
}

export async function saveRecentlyViewed(vehicle) {
  const database = await getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO recently_viewed
       (id, brand, model, year, cover_image, price_per_day, location, viewed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      vehicle.id,
      vehicle.brand,
      vehicle.model,
      vehicle.year,
      vehicle.coverImage || null,
      vehicle.pricePerDay || null,
      vehicle.location || null,
      Date.now(),
    ]
  );
}

// Lấy tối đa 10 xe xem gần nhất
export async function getRecentlyViewed(limit = 10) {
  const database = await getDb();
  return await database.getAllAsync(
    `SELECT id, brand, model, year, cover_image AS coverImage,
            price_per_day AS pricePerDay, location
     FROM recently_viewed
     ORDER BY viewed_at DESC
     LIMIT ?`,
    [limit]
  );
}

export async function clearRecentlyViewed() {
  const database = await getDb();
  await database.runAsync('DELETE FROM recently_viewed');
}
