/// <reference path="../pb_data/types.d.ts" />
/* eslint-disable no-undef, no-unused-vars, no-empty */

migrate((db) => {
  const dao = new Dao(db);

  // 1. Update 'missions' collection
  const missions = dao.findCollectionByNameOrId("missions");
  missions.listRule = "@request.auth.id != ''";
  missions.viewRule = "@request.auth.id != ''";
  dao.saveCollection(missions);

  // 2. Update 'responses' collection
  const responses = dao.findCollectionByNameOrId("responses");
  responses.listRule = "@request.auth.id != ''";
  responses.viewRule = "@request.auth.id != ''";
  dao.saveCollection(responses);

  // 3. Update 'users' collection
  const users = dao.findCollectionByNameOrId("users");
  users.listRule = "@request.auth.id != ''";
  users.viewRule = "@request.auth.id != ''";

  // 4. Add 'requirePasswordReset' field
  if (!users.schema.getFieldByName("requirePasswordReset")) {
    users.schema.addField(new SchemaField({
      name: "requirePasswordReset",
      type: "bool",
      system: false,
      required: false,
      options: {}
    }));
  }

  dao.saveCollection(users);

}, (db) => {
  const dao = new Dao(db);

  // Revert rules
  try {
      const missions = dao.findCollectionByNameOrId("missions");
  try {
      const missions = dao.findCollectionByNameOrId("missions");
      missions.listRule = "id != ''";
      missions.viewRule = "id != ''";
      dao.saveCollection(missions);
  } catch(e) {
      console.error("Failed to revert 'missions' rules:", e);
  }

      const field = users.schema.getFieldByName("requirePasswordReset");
      if (field) {
        users.schema.removeField("requirePasswordReset");
      }
      dao.saveCollection(users);
  } catch(_) {}
});
