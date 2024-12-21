// This is a mock implementation. In a real application, you would fetch the blacklist from an API or database.
const mockBlacklist = [
  { fullName: 'John Doe', phoneNumber: '+1234567890' },
  { fullName: 'Jane Smith', phoneNumber: '+0987654321' },
];

/**
 * Checks if a given full name and phone number are present in a blacklist.
 * @param {string} fullName - The full name to check against the blacklist.
 * @param {string} phoneNumber - The phone number to check against the blacklist.
 * @returns {boolean} Returns true if either the full name or phone number is found in the blacklist, false otherwise.
 */
export const checkBlacklist = (fullName: string, phoneNumber: string): boolean => {
  return mockBlacklist.some(
    item => item.fullName.toLowerCase() === fullName.toLowerCase() || item.phoneNumber === phoneNumber
  );
};
