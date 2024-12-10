migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("chat_messages");

  collection.listRule = "user = @request.auth.email";
  collection.viewRule = "user = @request.auth.email";
  collection.createRule = "@request.auth.email != ''";
  collection.updateRule = "user = @request.auth.email";
  collection.deleteRule = "user = @request.auth.email";

  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("chat_messages");

  collection.listRule = null;
  collection.viewRule = null;
  collection.createRule = null;
  collection.updateRule = null;
  collection.deleteRule = null;

  return dao.saveCollection(collection);
});