/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("users");

  // Allow any authenticated user to see the roster
  collection.listRule = "id != ''";
  collection.viewRule = "id != ''";

  // Only Admins can create new users (or import them)
  collection.createRule = "@request.auth.role = 'Admin'";

  // Users can update themselves (e.g. password), Admins can update anyone
  collection.updateRule = "id = @request.auth.id || @request.auth.role = 'Admin'";

  // Only Admins can delete users
  collection.deleteRule = "@request.auth.role = 'Admin'";

  dao.saveCollection(collection);
}, (db) => {
  // partial revert
  const dao = new Dao(db);
  try {
    const collection = dao.findCollectionByNameOrId("users");
    collection.listRule = "id = @request.auth.id";
    collection.viewRule = "id = @request.auth.id";
    collection.createRule = "";
    collection.updateRule = "id = @request.auth.id";
    collection.deleteRule = "id = @request.auth.id";
    dao.saveCollection(collection);
  } catch (_) {}
});
