/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db);

  // 1. Deduplicate existing records
  // We fetch all records, ordered by created DESC (newest first).
  // We keep the first one encountered for each (mission, user) pair and delete the rest.
  try {
    const records = dao.findRecordsByFilter("responses", "id != ''", "-created");
    const seen = {}; // key: mission_user

    for (const record of records) {
      const key = `${record.get("mission")}_${record.get("user")}`;
      if (seen[key]) {
        // This is a duplicate (and older because of sort), delete it.
        dao.deleteRecord(record);
      } else {
        seen[key] = true;
      }
    }
  } catch (e) {
    // If collection doesn't exist yet (fresh install), this might fail, which is fine.
    console.log("Cleanup skipped or failed: ", e);
  }

  // 2. Add unique index
  const collection = dao.findCollectionByNameOrId("responses");

  // Add unique index to prevent duplicate responses for the same mission + user
  collection.indexes = [
    "CREATE UNIQUE INDEX idx_mission_user ON responses (mission, user)"
  ];

  dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("responses");

  collection.indexes = [];

  dao.saveCollection(collection);
});
