/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db);

  // 1. Update 'users' collection
  const users = dao.findCollectionByNameOrId("users");
  
  // Check if fields exist to avoid duplication if re-run (though migrations run once)
  if (!users.schema.getFieldByName("role")) {
    users.schema.addField(new SchemaField({
      name: "role",
      type: "select",
      options: {
        maxSelect: 1,
        values: ["Admin", "Responder"]
      }
    }));
  }
  
  if (!users.schema.getFieldByName("memberId")) {
    users.schema.addField(new SchemaField({
      name: "memberId",
      type: "text"
    }));
  }

  dao.saveCollection(users);

  // 2. Create 'missions' collection
  try {
    const missions = dao.findCollectionByNameOrId("missions");
  } catch (e) {
    const missions = new Collection({
      name: "missions",
      type: "base",
      listRule: "id != ''",
      viewRule: "id != ''",
      createRule: "@request.auth.role = 'Admin'",
      updateRule: "@request.auth.role = 'Admin'",
      deleteRule: null,
      schema: [
        { name: "title", type: "text", required: true },
        { name: "location", type: "text", required: true },
        { name: "mapUrl", type: "url" },
        { 
          name: "status", 
          type: "select", 
          options: { maxSelect: 1, values: ["active", "closed"] } 
        }
      ]
    });
    dao.saveCollection(missions);
  }

  // 3. Create 'responses' collection
  try {
    const responses = dao.findCollectionByNameOrId("responses");
  } catch (e) {
    const responses = new Collection({
      name: "responses",
      type: "base",
      listRule: "id != ''",
      viewRule: "id != ''",
      createRule: "id != ''",
      updateRule: "id != ''",
      deleteRule: null,
      schema: [
        { name: "status", type: "text" }, // Guide says Text. App implies specific values, but Text allows flexibility.
        { name: "eta", type: "text" },
        {
          name: "mission",
          type: "relation",
          required: true,
          options: {
            collectionId: "missions",
            cascadeDelete: false,
            maxSelect: 1
          }
        },
        {
          name: "user",
          type: "relation",
          required: true,
          options: {
            collectionId: "users",
            cascadeDelete: false,
            maxSelect: 1
          }
        }
      ]
    });
    dao.saveCollection(responses);
  }

}, (db) => {
  // Revert logic (optional, but good practice)
  const dao = new Dao(db);
  try {
    const missions = dao.findCollectionByNameOrId("missions");
    dao.deleteCollection(missions);
  } catch(_) {}
  
  try {
    const responses = dao.findCollectionByNameOrId("responses");
    dao.deleteCollection(responses);
  } catch(_) {}
});
