// This is a mock implementation. In a real application, you would fetch the blacklist from an API or database.
const mockBlacklist = [
  { fullName: 'John Doe', phoneNumber: '+1234567890' },
  { fullName: 'Jane Smith', phoneNumber: '+0987654321' },
];

export const checkBlacklist = (fullName: string, phoneNumber: string): boolean => {
  return mockBlacklist.some(
    item => item.fullName.toLowerCase() === fullName.toLowerCase() || item.phoneNumber === phoneNumber
  );
};
