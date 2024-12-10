migrate((db) => {
    const collection = new Collection({
      id: 'chat_messages',
      name: 'chat_messages',
      type: 'base',
      system: false,
      schema: [
        {
          id: 'user',
          name: 'user',
          type: 'text',
          required: true
        },
        {
          id: 'role',
          name: 'role',
          type: 'text',
          required: true,
          options: {
            min: 1,
            max: 20
          }
        },
        {
          id: 'content',
          name: 'content',
          type: 'text',
          required: true
        },
        {
          id: 'conversation_id',
          name: 'conversation_id',
          type: 'text',
          required: true,
          options: {
            min: 1,
            max: 50
          }
        }
      ]
    });
  
    return Dao(db).saveCollection(collection);
  }, (db) => {
    return Dao(db).deleteCollection('chat_messages');
  }); 