import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';

interface BlacklistItem {
  id: string;
  fullName: string;
  phoneNumber: string;
}

const BlacklistManagement: React.FC = () => {
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
  const [newItem, setNewItem] = useState({ fullName: '', phoneNumber: '' });

  useEffect(() => {
    // Fetch blacklist from API or local storage
    // For now, we'll use mock data
    const mockBlacklist: BlacklistItem[] = [
      { id: '1', fullName: 'John Doe', phoneNumber: '+1234567890' },
      { id: '2', fullName: 'Jane Smith', phoneNumber: '+0987654321' },
    ];
    setBlacklist(mockBlacklist);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  const handleAddItem = () => {
    if (newItem.fullName && newItem.phoneNumber) {
      const newBlacklistItem: BlacklistItem = {
        id: Date.now().toString(),
        ...newItem
      };
      setBlacklist(prev => [...prev, newBlacklistItem]);
      setNewItem({ fullName: '', phoneNumber: '' });
    }
  };

  const handleRemoveItem = (id: string) => {
    setBlacklist(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Blacklist Management</h2>
      <div className="mb-4">
        <input
          type="text"
          name="fullName"
          value={newItem.fullName}
          onChange={handleInputChange}
          placeholder="Full Name"
          className="mr-2 p-2 border rounded"
        />
        <input
          type="text"
          name="phoneNumber"
          value={newItem.phoneNumber}
          onChange={handleInputChange}
          placeholder="Phone Number"
          className="mr-2 p-2 border rounded"
        />
        <Button onClick={handleAddItem}>Add to Blacklist</Button>
      </div>
      <ul>
        {blacklist.map(item => (
          <li key={item.id} className="flex justify-between items-center mb-2">
            <span>{item.fullName} - {item.phoneNumber}</span>
            <Button onClick={() => handleRemoveItem(item.id)} variant="destructive">Remove</Button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BlacklistManagement;
