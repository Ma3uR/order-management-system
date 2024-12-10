/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("chat_messages");

  // Update schema to ensure user is text, not relation
  collection.schema = [
    {
      id: 'user',
      name: 'user',
      type: 'text',
      required: true,
      options: {
        min: null,
        max: null,
        pattern: ''
      }
    },
    {
      id: 'role',
      name: 'role',
      type: 'text',
      required: true,
      options: {
        min: null,
        max: null,
        pattern: ''
      }
    },
    {
      id: 'content',
      name: 'content',
      type: 'text',
      required: true,
      options: {
        min: null,
        max: null,
        pattern: ''
      }
    },
    {
      id: 'conversation_id',
      name: 'conversation_id',
      type: 'text',
      required: true,
      options: {
        min: null,
        max: null,
        pattern: ''
      }
    }
  ];

  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("chat_messages");

  // Revert schema
  collection.schema = [];

  return dao.saveCollection(collection);
}); 