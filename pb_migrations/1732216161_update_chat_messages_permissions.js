/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("chat_messages")

  // Allow any authenticated user to create and view messages
  collection.createRule = "@request.auth.id != ''"
  collection.viewRule = "@request.auth.id != ''"
  collection.listRule = "@request.auth.id != ''"
  
  // Allow users to update and delete only their own messages
  collection.updateRule = "@request.auth.id != '' && user = @request.auth.email"
  collection.deleteRule = "@request.auth.id != '' && user = @request.auth.email"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("chat_messages")

  collection.createRule = null
  collection.viewRule = null
  collection.listRule = null
  collection.updateRule = null
  collection.deleteRule = null

  return dao.saveCollection(collection)
}) 