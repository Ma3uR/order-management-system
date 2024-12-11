import XLSX from 'xlsx';
import PocketBase from 'pocketbase';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file's directory when using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize PocketBase client
const pb = new PocketBase('http://pocketbase-d04wg4wgw0cs8kcwoww88w0k.78.47.226.230.sslip.io');

interface ExcelRow {
  [key: string]: any;
}

interface BlacklistEntry {
  fullName: string;
  phoneNumber: string;
  city: string;
  totalOrderSum: number;
  notes: string;
}

// Helper function to clean phone numbers
function cleanPhoneNumber(phone: string | number | null | undefined): string {
  // Handle null/undefined cases
  if (!phone && phone !== 0) {
    console.log('Warning: Empty phone number');
    return '';
  }
  
  // Convert to string and ensure it's treated as a string
  let cleaned = String(phone).trim();
  
  // Remove all non-digit characters
  cleaned = cleaned.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('380')) {
    cleaned = cleaned.slice(3); // Remove 380
  }
  
  // Add leading zero if missing
  if (cleaned.length === 9) {
    cleaned = '0' + cleaned;
  } else if (cleaned.length === 10 && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  
  // Ensure it's a string and starts with '0'
  if (!cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }
  
  // Log the transformation for debugging
  console.log('Phone number transformation:', {
    input: phone,
    afterCleaning: cleaned,
    length: cleaned.length,
    startsWithZero: cleaned.startsWith('0')
  });
  
  return cleaned;
}

// Helper function to capitalize words in a name or city
function capitalizeWords(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

async function authenticateAdmin() {
  try {
    const adminEmail = 'andriimazurenko99@gmail.com';
    const adminPassword = 'QWEqweqwe382846382846';
    
    if (!adminEmail || !adminPassword) {
      throw new Error('Admin credentials not configured');
    }

    await pb.admins.authWithPassword(adminEmail, adminPassword);
  } catch (error) {
    console.error('Admin authentication error:', error);
    throw error;
  }
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to process records sequentially
async function processRecords(data: BlacklistEntry[]) {
  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < data.length; i++) {
    try {
      console.log(`Processing record ${i + 1} of ${data.length}`);
      
      // Ensure phone number format before sending
      const recordToCreate = {
        ...data[i],
        phoneNumber: data[i].phoneNumber.startsWith('0') 
          ? data[i].phoneNumber 
          : `0${data[i].phoneNumber}`
      };

      // Log the actual data being sent
      console.log('Sending record:', {
        fullName: recordToCreate.fullName,
        phoneNumber: recordToCreate.phoneNumber,
        phoneNumberLength: recordToCreate.phoneNumber.length,
        startsWithZero: recordToCreate.phoneNumber.startsWith('0')
      });
      
      const result = await pb.collection('blacklist_entries').create(recordToCreate);
      
      // Convert the phone number to string before checking
      const savedPhoneNumber = String(result.phoneNumber);
      
      // Verify the saved data
      console.log('Saved record:', {
        fullName: result.fullName,
        phoneNumber: savedPhoneNumber,
        phoneNumberLength: savedPhoneNumber.length,
        startsWithZero: savedPhoneNumber.startsWith('0'),
        phoneNumberType: typeof result.phoneNumber
      });

      // If the saved phone number doesn't start with 0, try to update it
      if (!savedPhoneNumber.startsWith('0')) {
        console.log('Attempting to fix phone number format...');
        const fixedPhoneNumber = savedPhoneNumber.startsWith('0') 
          ? savedPhoneNumber 
          : `0${savedPhoneNumber}`;
          
        await pb.collection('blacklist_entries').update(result.id, {
          ...result,
          phoneNumber: fixedPhoneNumber
        });
        
        console.log('Fixed phone number:', fixedPhoneNumber);
      }

      results.push(result);
      successCount++;
      
      await delay(200);
      
      if ((i + 1) % 10 === 0) {
        console.log(`Progress: ${i + 1}/${data.length} records processed`);
        console.log(`Success: ${successCount}, Failed: ${failCount}`);
      }
    } catch (error) {
      console.error(`Error processing record ${i + 1}:`, error);
      console.error('Failed record data:', data[i]);
      failCount++;
      continue;
    }
  }

  return {
    results,
    successCount,
    failCount
  };
}

async function importExcelData() {
  try {
    // Read the Excel file using the correct path resolution
    const filePath = path.join(dirname(__dirname), 'data', 'BLData.xlsx');
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert Excel data to JSON, starting from row 2 (skipping headers)
    const excelData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, {
      range: 1, // Start from second row
      header: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']
    });

    // Map Excel data to blacklist_entries structure
    const mappedData: BlacklistEntry[] = excelData.map((row, index) => {
      try {
        const phoneNumber = cleanPhoneNumber(row['L']);
        
        // Log the mapping process
        console.log(`Row ${index + 2} mapping:`, {
          originalPhone: row['L'],
          cleanedPhone: phoneNumber,
          phoneLength: phoneNumber.length,
          startsWithZero: phoneNumber.startsWith('0')
        });
        
        return {
          fullName: capitalizeWords(row['M']?.toString() || ''),
          phoneNumber: phoneNumber,
          city: capitalizeWords(row['I']?.toString() || ''),
          totalOrderSum: row['E'] ? parseFloat(row['E'].toString()) : 0,
          notes: ''
        };
      } catch (error) {
        console.error(`Error processing row ${index + 2}:`, error, row);
        return {
          fullName: '',
          phoneNumber: '',
          city: '',
          totalOrderSum: 0,
          notes: ''
        };
      }
    });

    // Add additional validation for phone numbers
    const validData = mappedData.filter(row => {
      const isValid = 
        row.fullName && 
        row.phoneNumber && 
        /^0\d{9}$/.test(row.phoneNumber) && // Must be exactly 10 digits starting with 0
        row.city && 
        !isNaN(row.totalOrderSum);

      if (!isValid) {
        console.log('Invalid record:', {
          fullName: row.fullName,
          phoneNumber: {
            value: row.phoneNumber,
            length: row.phoneNumber.length,
            format: row.phoneNumber ? row.phoneNumber.match(/^0\d{9}$/) ? 'valid' : 'invalid' : 'empty'
          },
          city: row.city,
          totalOrderSum: row.totalOrderSum
        });
      }

      return isValid;
    });

    console.log(`Found ${validData.length} valid records to import`);

    // Authenticate admin
    await authenticateAdmin();

    const { results, successCount, failCount } = await processRecords(validData);

    console.log('\nImport Summary:');
    console.log(`Total records processed: ${validData.length}`);
    console.log(`Successfully imported: ${successCount}`);
    console.log(`Failed to import: ${failCount}`);

    return results;

  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

// Run the import
importExcelData()
  .then(() => {
    console.log('Import completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  }); 