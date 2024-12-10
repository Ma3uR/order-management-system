migrate((db) => {
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
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: ""
  });

  return db.createCollection(collection);
}, (db) => {
  return db.deleteCollection('chat_messages');
}); 