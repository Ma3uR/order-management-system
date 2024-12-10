migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("chat_messages");

  // Update collection rules to be more permissive
  collection.listRule = null;   // Allow anyone to list messages
  collection.viewRule = null;   // Allow anyone to view messages
  collection.createRule = null; // Allow anyone to create messages
  collection.updateRule = null; // Allow anyone to update messages
  collection.deleteRule = null; // Allow anyone to delete messages

  return collection;
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("chat_messages");
  
  // Revert changes
  collection.listRule = "";
  collection.viewRule = "";
  collection.createRule = "";
  collection.updateRule = "user = @request.auth.id";
  collection.deleteRule = "user = @request.auth.id";
  
  return collection;
}); 