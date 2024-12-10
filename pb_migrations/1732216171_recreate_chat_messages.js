migrate((db) => {
  // First, delete the existing collection if it exists
  try {
    db.deleteCollection('chat_messages');
  } catch (e) {
    // Collection might not exist, ignore error
  }

  // Create new collection
  const collection = new Collection({
    name: 'chat_messages',
    type: 'base',
    schema: [
      {
        name: 'user_email',
        type: 'text',
        required: true,
      },
      {
        name: 'role',
        type: 'select',
        required: true,
        options: {
          values: ['user', 'assistant']
        }
      },
      {
        name: 'content',
        type: 'text',
        required: true,
      },
      {
        name: 'conversation_id',
        type: 'text',
        required: true,
      }
    ],
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null
  });

  return db.createCollection(collection);
}, (db) => {
  return db.deleteCollection('chat_messages');
}); 