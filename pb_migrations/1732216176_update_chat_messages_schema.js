migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("chat_messages");

  // Update the user field to be a proper relation
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "user",
    "name": "user",
    "type": "relation",
    "required": false,
    "unique": false,
    "options": {
      "collectionId": "_pb_users_auth_",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": ["email"]
    }
  }));

  return collection;
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("chat_messages");
  
  collection.schema.removeField("user");
  
  return collection;
}); 