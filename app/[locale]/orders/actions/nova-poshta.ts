'use server'

import { getNovaPoshtaService, initNovaPoshtaService } from '@/app/lib/services/nova-poshta';
import pb from '@/app/lib/pocketbase';
// Initialize the Nova Poshta service with the API key from server environment
const initializeNovaPoshtaService = () => {
  const apiKey = process.env.NOVA_POSHTA_API_KEY;
  if (!apiKey) {
    throw new Error('Nova Poshta API key not found in environment variables');
  }
  return initNovaPoshtaService(apiKey);
};

// Define the type for the Nova Poshta API settlement response
interface NovaPoshtaSettlementResponse {
  Present: string;
  MainDescription: string;
  Ref: string;
  Area: string;
  Region: string;
  SettlementTypeCode: string;
  Warehouses: number;
  DeliveryCity: string;
  AddressDeliveryAllowed: boolean;
  StreetsAvailability: boolean;
  ParentRegionTypes: string;
  ParentRegionCode: string;
  RegionTypes: string;
  RegionTypesCode: string;
}

// Search for settlements
export async function searchSettlements(query: string) {
  'use server';
  
  try {
    const apiKey = process.env.NOVA_POSHTA_API_KEY;
    if (!apiKey) {
      return { error: 'Nova Poshta API key is missing' };
    }

    const response = await fetch('https://api.novaposhta.ua/v2.0/json/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        modelName: 'Address',
        calledMethod: 'searchSettlements',
        methodProperties: {
          CityName: query,
          Limit: 20,
        },
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      return { error: result.errors.join(', ') };
    }
    
    // Map the API response to the expected format
    // The actual data is in result.data[0].Addresses
    if (result.data && result.data[0] && result.data[0].Addresses) {
      const settlements = result.data[0].Addresses.map((item: NovaPoshtaSettlementResponse) => ({
        Description: item.Present || item.MainDescription,
        Ref: item.Ref,
        AreaDescription: item.Area,
        // Map other properties as needed by your component
      }));
      
      return { data: settlements };
    }
    
    // If we don't have the expected structure, try to use the data as is
    if (result.data && Array.isArray(result.data)) {
      return { data: result.data };
    }
    
    return { data: [] };
  } catch (error) {
    console.error('Error searching settlements:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get warehouses by city reference
export async function getWarehouses(cityRef: string) {
  try {
    initializeNovaPoshtaService();
    const service = getNovaPoshtaService();
    const warehouses = await service.getWarehouses(cityRef);
    return { data: warehouses, error: null };
  } catch (error) {
    console.error('Error getting warehouses:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Create an Internet Document (TTN)
export async function createInternetDocument(params: {
  orderId: string;
  senderCityRef: string;
  recipientCityRef: string;
  senderRef: string;
  recipientRef: string;
  contactSender: string;
  contactRecipient: string;
  senderAddressRef: string;
  recipientAddressRef: string;
  weight: number;
  cost: number;
  serviceType: string;
  payerType: string;
  paymentMethod: string;
  description: string;
  seatsAmount: number;
  cargoType: string;
  recipientPhone: string;
  recipientFullName: string;
  senderPhone: string;
  volumeGeneral?: number;
  length?: number;
  width?: number;
  height?: number;
}) {
  try {
    initializeNovaPoshtaService();
    const service = getNovaPoshtaService();
    const document = await service.createInternetDocument(params);
    
    pb.collection('orders').update(params.orderId, {
      invoice_data: document
    })
    return { 
      data: document, 
      error: null 
    };
  } catch (error) {
    console.error('Error creating Internet Document:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Delete an Internet Document (TTN)
export async function deleteInternetDocument(documentRef: string) {
  try {
    console.log('Deleting Internet Document with ref:', documentRef);
    
    initializeNovaPoshtaService();
    const service = getNovaPoshtaService();
    
    await service.deleteInternetDocument(documentRef);
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting Internet Document:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Track a document
export async function trackDocument(documentNumber: string) {
  try {
    initializeNovaPoshtaService();
    const service = getNovaPoshtaService();
    const trackingInfo = await service.trackDocument(documentNumber);
    return { data: trackingInfo, error: null };
  } catch (error) {
    console.error('Error tracking document:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get counterparty contact persons
export async function getCounterpartyContactPersons(counterpartyRef: string) {
  try {
    initializeNovaPoshtaService();
    const service = getNovaPoshtaService();
    const contactPersons = await service.getCounterpartyContactPersons(counterpartyRef);
    return { data: contactPersons, error: null };
  } catch (error) {
    console.error('Error getting counterparty contact persons:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get counterparties list
export async function getCounterparties(counterpartyProperty: 'Sender' | 'Recipient' | 'ThirdPerson', page = 1, findByString?: string) {
  try {
    const apiKey = process.env.NOVA_POSHTA_API_KEY;
    if (!apiKey) {
      return { error: 'Nova Poshta API key is missing' };
    }

    const methodProperties: Record<string, string> = {
      CounterpartyProperty: counterpartyProperty,
      Page: page.toString()
    };

    if (findByString) {
      methodProperties.FindByString = findByString;
    }

    const requestBody = {
      apiKey,
      modelName: 'Counterparty',
      calledMethod: 'getCounterparties',
      methodProperties
    };

    console.log('Nova Poshta API Request:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.novaposhta.ua/v2.0/json/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Don't log the raw Response object
    const result = await response.json();
    
    // Log the actual response data
    console.log('Nova Poshta API Response:', JSON.stringify(result, null, 2));
    
    if (!result.success) {
      return { error: result.errors.join(', ') };
    }
    
    return { data: result.data };
  } catch (error) {
    console.error('Error getting counterparties:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Debug function to test recipient search with a specific term
export async function testRecipientSearch(searchTerm: string) {
  'use server';
  
  console.log(`Testing recipient search with term: "${searchTerm}"`);
  return await getCounterparties('Recipient', 1, searchTerm);
}

// Add a new server action to create a counterparty
export async function createCounterparty(params: {
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  email?: string;
  counterpartyType?: string;
  counterpartyProperty?: 'Sender' | 'Recipient' | 'ThirdPerson';
}) {
  try {
    // Format the phone number if needed (ensure it starts with 380)
    let phone = params.phone.trim();
    if (phone.startsWith('+')) {
      phone = phone.substring(1);
    }
    if (!phone.startsWith('380') && phone.startsWith('0')) {
      phone = '38' + phone;
    }

    const apiKey = process.env.NOVA_POSHTA_API_KEY;
    if (!apiKey) {
      return { error: 'Nova Poshta API key is missing' };
    }

    // Create request body directly for better control
    const requestBody = {
      apiKey,
      modelName: 'CounterpartyGeneral',
      calledMethod: 'save',
      methodProperties: {
        FirstName: params.firstName,
        MiddleName: params.middleName,
        LastName: params.lastName,
        Phone: phone,
        Email: params.email || '',
        CounterpartyType: params.counterpartyType || 'PrivatePerson',
        CounterpartyProperty: params.counterpartyProperty || 'Recipient'
      }
    };

    console.log('Creating counterparty with data:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.novaposhta.ua/v2.0/json/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    
    console.log('Nova Poshta API Counterparty Creation Response:', JSON.stringify(result, null, 2));
    
    if (!result.success) {
      return { error: result.errors.join(', '), data: null };
    }
    
    return { data: result.data[0], error: null };
  } catch (error) {
    console.error('Error creating counterparty:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Add a server action to create a contact person
export async function createContactPerson(params: {
  counterpartyRef: string;
  firstName: string;
  lastName: string;
  middleName: string;
  phone: string;
}) {
  try {
    // Format phone number if needed
    let phone = params.phone.trim();
    if (phone.startsWith('+')) {
      phone = phone.substring(1);
    }
    if (!phone.startsWith('380') && phone.startsWith('0')) {
      phone = '38' + phone;
    }

    const apiKey = process.env.NOVA_POSHTA_API_KEY;
    if (!apiKey) {
      return { error: 'Nova Poshta API key is missing' };
    }

    // Create request directly for better control
    const requestBody = {
      apiKey,
      modelName: 'ContactPersonGeneral',
      calledMethod: 'save',
      methodProperties: {
        CounterpartyRef: params.counterpartyRef,
        FirstName: params.firstName,
        LastName: params.lastName,
        MiddleName: params.middleName,
        Phone: phone
      }
    };

    console.log('Creating contact person with data:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.novaposhta.ua/v2.0/json/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    
    console.log('Nova Poshta API Contact Person Creation Response:', JSON.stringify(result, null, 2));
    
    if (!result.success) {
      return { error: result.errors.join(', '), data: null };
    }
    
    return { data: result.data[0], error: null };
  } catch (error) {
    console.error('Error creating contact person:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
} 