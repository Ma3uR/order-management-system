/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  
  // Delete the existing collection
  try {
    dao.deleteCollection('chat_messages');
  } catch (e) {}

  // Create a new collection
  const collection = new Collection({
    id: 'chat_messages',
    name: 'chat_messages',
    type: 'base',
    system: false,
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != '' && user = @request.auth.email",
    deleteRule: "@request.auth.id != '' && user = @request.auth.email",
    options: {},
    schema: [
      {
        system: false,
        id: 'user_email',  // Changed from 'user' to 'user_email' to avoid confusion
        name: 'user',
        type: 'text',
        required: true,
        unique: false,
        options: {
          min: null,
          max: null,
          pattern: ''
        }
      },
      {
        system: false,
        id: 'message_role',  // Changed from 'role' to 'message_role' to avoid confusion
        name: 'role',
        type: 'text',
        required: true,
        unique: false,
        options: {
          min: null,
          max: null,
          pattern: ''
        }
      },
      {
        system: false,
        id: 'message_content',  // Changed from 'content' to 'message_content'
        name: 'content',
        type: 'text',
        required: true,
        unique: false,
        options: {
          min: null,
          max: null,
          pattern: ''
        }
      },
      {
        system: false,
        id: 'conv_id',  // Changed from 'conversation_id' to 'conv_id'
        name: 'conversation_id',
        type: 'text',
        required: true,
        unique: false,
        options: {
          min: null,
          max: null,
          pattern: ''
        }
      }
    ]
  });

  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  dao.deleteCollection('chat_messages');
}); 