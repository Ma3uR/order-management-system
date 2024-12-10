/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("chat_messages");

  // Update collection options
  collection.options = {
    allowEmailAuth: false,
    allowOAuth2Auth: false,
    allowUsernameAuth: false,
    exceptEmailDomains: null,
    manageRule: null,
    minPasswordLength: 8,
    onlyEmailDomains: null,
    requireEmail: false
  };

  // Update schema
  collection.schema = [
    {
      system: false,
      id: 'user',
      name: 'user',
      type: 'text',
      required: true,
      presentable: false,
      unique: false,
      options: {
        min: null,
        max: null,
        pattern: ''
      }
    },
    {
      system: false,
      id: 'role',
      name: 'role',
      type: 'text',
      required: true,
      presentable: false,
      unique: false,
      options: {
        min: null,
        max: null,
        pattern: ''
      }
    },
    {
      system: false,
      id: 'content',
      name: 'content',
      type: 'text',
      required: true,
      presentable: false,
      unique: false,
      options: {
        min: null,
        max: null,
        pattern: ''
      }
    },
    {
      system: false,
      id: 'conversation_id',
      name: 'conversation_id',
      type: 'text',
      required: true,
      presentable: false,
      unique: false,
      options: {
        min: null,
        max: null,
        pattern: ''
      }
    }
  ];

  // Update permissions
  collection.listRule = "@request.auth.id != ''";
  collection.viewRule = "@request.auth.id != ''";
  collection.createRule = "@request.auth.id != ''";
  collection.updateRule = "@request.auth.id != '' && user = @request.auth.email";
  collection.deleteRule = "@request.auth.id != '' && user = @request.auth.email";

  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("chat_messages");

  // Revert options
  collection.options = {};

  // Revert schema
  collection.schema = [];

  // Revert permissions
  collection.listRule = null;
  collection.viewRule = null;
  collection.createRule = null;
  collection.updateRule = null;
  collection.deleteRule = null;

  return dao.saveCollection(collection);
}); 