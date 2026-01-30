/// <reference path="../pb_data/types.d.ts" />
/* eslint-disable no-undef, no-unused-vars */

migrate((db) => {
  const dao = new Dao(db);

  // 1. Update 'missions' collection
  const missions = dao.findCollectionByNameOrId("missions");
  missions.listRule = "@request.auth.id != ''";
  missions.viewRule = "@request.auth.id != ''";
  dao.saveCollection(missions);

  // 2. Update 'responses' collection
  // 2. Update 'responses' collection
  const responses = dao.findCollectionByNameOrId("responses");
  responses.listRule = "@request.auth.id != ''";
  responses.viewRule = "@request.auth.id != ''";
  responses.createRule = "@request.auth.id != '' && user = @request.auth.id";
  responses.updateRule = "@request.auth.id != '' && user = @request.auth.id";
  dao.saveCollection(responses);
  // 3. Update 'users' collection
  const users = dao.findCollectionByNameOrId("users");
  users.listRule = "@request.auth.id != ''";
  users.viewRule = "@request.auth.id != ''";

  // Harden update rule: Users can only clear 'requirePasswordReset' if they are also setting a password
   users.updateRule = "(@request.auth.role = 'Admin') || (id = @request.auth.id && @request.data.role:isset = false && @request.data.memberId:isset = false && (@request.data.requirePasswordReset != false || @request.data.password:isset = true))";

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
      missions.listRule = "id != ''";
      missions.viewRule = "id != ''";
      dao.saveCollection(missions);
  } catch(e) {
      console.error("Failed to revert missions collection:", e);
  }

  try {
      const responses = dao.findCollectionByNameOrId("responses");
      responses.listRule = "id != ''";
      responses.viewRule = "id != ''";
      dao.saveCollection(responses);
  } catch(e) {
      console.error("Failed to revert responses collection:", e);
  }

  try {
      const users = dao.findCollectionByNameOrId("users");
      users.listRule = "id != ''";
      users.viewRule = "id != ''";
      // Revert to previous permissive update rule (from 1706100002)
      users.updateRule = "id = @request.auth.id || @request.auth.role = 'Admin'";

      const field = users.schema.getFieldByName("requirePasswordReset");
      if (field) {
        users.schema.removeField("requirePasswordReset");
      }
      dao.saveCollection(users);
  } catch(e) {
      console.error("Failed to revert users collection:", e);
  }
});
