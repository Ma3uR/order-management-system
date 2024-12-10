migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("chat_messages");

  // Update collection rules
  collection.listRule = ""; // Allow anyone to list messages
  collection.viewRule = ""; // Allow anyone to view messages
  collection.createRule = ""; // Allow anyone to create messages
  collection.updateRule = "user = @request.auth.id"; // Only allow users to update their own messages
  collection.deleteRule = "user = @request.auth.id"; // Only allow users to delete their own messages

  // Add indexes for better performance
  collection.createIndex("idx_conversation", {
    field: "conversation_id",
    type: "text"
  });

  return collection;
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("chat_messages");
  
  // Revert changes
  collection.listRule = "conversation_id != ''";
  collection.viewRule = "conversation_id != ''";
  collection.createRule = "conversation_id != ''";
  collection.updateRule = "conversation_id = @request.data.conversation_id";
  collection.deleteRule = "conversation_id = @request.data.conversation_id";
  
  // Remove index
  collection.deleteIndex("idx_conversation");
  
  return collection;
}); 