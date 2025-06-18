/**
 * Nova Poshta API Service
 * Documentation: https://api.novaposhta.ua/
 */

interface NovaPoshtaConfig {
  apiKey: string;
  endpoint: string;
}

export interface NovaPoshtaSettlement {
  Ref: string;
  SettlementType: string;
  Description: string;
  DescriptionRu: string;
  Area: string;
  AreaDescription: string;
  Region: string;
  RegionsDescription: string;
}

export interface NovaPoshtaWarehouse {
  Ref: string;
  Description: string;
  DescriptionRu: string;
  ShortAddress: string;
  Number: string;
  CityRef: string;
  CityDescription: string;
  SettlementRef: string;
  SettlementDescription: string;
}

export interface NovaPoshtaRequestParams {
  modelName: string;
  calledMethod: string;
  methodProperties: Record<string, unknown>;
}

export interface NovaPoshtaResponse<T> {
  success: boolean;
  data: T[];
  errors: string[];
  warnings: string[];
  info: string[];
  messageCodes: string[];
  errorCodes: string[];
  warningCodes: string[];
  infoCodes: string[];
}

export interface NovaPoshtaInternetDocument {
  Ref: string;
  IntDocNumber: string;
  CostOnSite: string;
  EstimatedDeliveryDate: string;
}

export interface NovaPoshtaContactPerson {
  Ref: string;
  Description: string;
  FirstName: string;
  LastName: string;
  MiddleName: string;
  Phones: string;
}

export interface NovaPoshtaCounterparty {
  Ref: string;
  Description: string;
  FirstName: string;
  LastName: string;
  MiddleName: string;
  EDRPOU: string;
  CounterpartyType: string;
}

export interface NovaPoshtaCounterpartyCreationParams {
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  email?: string;
  counterpartyType?: string;
  counterpartyProperty?: string;
}

export interface NovaPoshtaCounterpartyCreationResponse {
  Ref: string;
  Description: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
  Counterparty: string;
  OwnershipForm: string;
  OwnershipFormDescription: string;
  EDRPOU: string;
  CounterpartyType: string;
  ContactPerson: NovaPoshtaContactPerson[];
}

export interface NovaPoshtaContactPersonCreationParams {
  counterpartyRef: string;
  firstName: string;
  lastName: string;
  middleName: string;
  phone: string;
}

export interface NovaPoshtaStreet {
  Ref: string;
  Description: string;
  StreetsType: string;
  StreetsTypeDescription: string;
}

export interface NovaPoshtaAddress {
  Ref: string;
  Description: string;
  Flat: string;
  CounterpartyRef: string;
}

export interface NovaPoshtaDocumentInfo {
  Ref: string;
  IntDocNumber: string;
  CreatedDate: string;
  Status: string;
  StatusCode: string;
  Weight: string;
  Cost: string;
  SenderFullName: string;
  RecipientFullName: string;
  CitySender: string;
  CityRecipient: string;
}

export interface NovaPoshtaTrackingInfo {
  Number: string;
  Status: string;
  StatusCode: string;
  ActualDeliveryDate: string;
  EstimatedDeliveryDate: string;
  WarehouseRecipient: string;
  WarehouseSender: string;
}

export interface NovaPoshtaDocumentListItem {
  Ref: string;
  IntDocNumber: string;
  CreatedDate: string;
  Status: string;
  StatusCode: string;
  Weight: string;
  Cost: string;
  SenderFullName: string;
  RecipientFullName: string;
}

class NovaPoshtaService {
  private config: NovaPoshtaConfig;

  constructor(apiKey: string) {
    this.config = {
      apiKey,
      endpoint: 'https://api.novaposhta.ua/v2.0/json/'
    };
  }

  /**
   * Safely format error messages from Nova Poshta API response
   */
  private formatErrorMessage(errors: unknown): string {
    if (Array.isArray(errors)) {
      return errors.join(', ');
    }
    if (typeof errors === 'string') {
      return errors;
    }
    if (errors && typeof errors === 'object') {
      return JSON.stringify(errors);
    }
    return 'Unknown error';
  }

  /**
   * Make a request to the Nova Poshta API
   */
  private async makeRequest<T>(params: NovaPoshtaRequestParams): Promise<NovaPoshtaResponse<T>> {
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.config.apiKey,
          ...params
        }),
      });

      // Nova Poshta API always returns 200 status code, even for errors
      const data = await response.json();
      return data as NovaPoshtaResponse<T>;
    } catch (error) {
      console.error('Nova Poshta API error:', error);
      throw new Error('Failed to communicate with Nova Poshta API');
    }
  }

  /**
   * Search for settlements (cities)
   */
  async searchSettlements(searchQuery: string, limit = 20): Promise<NovaPoshtaSettlement[]> {
    const response = await this.makeRequest<NovaPoshtaSettlement>({
      modelName: 'AddressGeneral',
      calledMethod: 'searchSettlements',
      methodProperties: {
        CityName: searchQuery,
        Limit: limit.toString(),
      },
    });

    if (!response.success) {
      throw new Error(`Nova Poshta API error: ${this.formatErrorMessage(response.errors)}`);
    }

    return response.data;
  }

  /**
   * Search for streets in a settlement
   */
  async searchStreets(settlementRef: string, streetName: string, limit = 20): Promise<NovaPoshtaStreet[]> {
    const response = await this.makeRequest<NovaPoshtaStreet>({
      modelName: 'AddressGeneral',
      calledMethod: 'searchSettlementStreets',
      methodProperties: {
        StreetName: streetName,
        SettlementRef: settlementRef,
        Limit: limit.toString(),
      },
    });

    if (!response.success) {
      throw new Error(`Nova Poshta API error: ${this.formatErrorMessage(response.errors)}`);
    }

    return response.data;
  }

  /**
   * Get warehouses by city reference
   */
  async getWarehouses(cityRef: string): Promise<NovaPoshtaWarehouse[]> {
    const response = await this.makeRequest<NovaPoshtaWarehouse>({
      modelName: 'AddressGeneral',
      calledMethod: 'getWarehouses',
      methodProperties: {
        SettlementRef: cityRef,
      },
    });

    if (!response.success) {
      throw new Error(`Nova Poshta API error: ${this.formatErrorMessage(response.errors)}`);
    }

    return response.data;
  }

  /**
   * Get counterparty addresses
   */
  async getCounterpartyAddresses(counterpartyRef: string, counterpartyProperty = 'Sender'): Promise<NovaPoshtaAddress[]> {
    const response = await this.makeRequest<NovaPoshtaAddress>({
      modelName: 'CounterpartyGeneral',
      calledMethod: 'getCounterpartyAddresses',
      methodProperties: {
        Ref: counterpartyRef,
        CounterpartyProperty: counterpartyProperty,
      },
    });

    if (!response.success) {
      throw new Error(`Nova Poshta API error: ${this.formatErrorMessage(response.errors)}`);
    }

    return response.data;
  }

  /**
   * Get counterparty contact persons
   */
  async getCounterpartyContactPersons(counterpartyRef: string, page = 1): Promise<NovaPoshtaContactPerson[]> {
    const response = await this.makeRequest<NovaPoshtaContactPerson>({
      modelName: 'CounterpartyGeneral',
      calledMethod: 'getCounterpartyContactPersons',
      methodProperties: {
        Ref: counterpartyRef,
        Page: page.toString(),
      },
    });

    if (!response.success) {
      throw new Error(`Nova Poshta API error: ${this.formatErrorMessage(response.errors)}`);
    }

    return response.data;
  }

  /**
   * Create a counterparty (recipient)
   * 
   * Creates a new counterparty with the given information.
   * Note: Data must be entered in Ukrainian language only.
   */
  async createCounterparty(params: NovaPoshtaCounterpartyCreationParams): Promise<NovaPoshtaCounterpartyCreationResponse> {
    const response = await this.makeRequest<NovaPoshtaCounterpartyCreationResponse>({
      modelName: 'CounterpartyGeneral',
      calledMethod: 'save',
      methodProperties: {
        FirstName: params.firstName,
        MiddleName: params.middleName,
        LastName: params.lastName,
        Phone: params.phone,
        Email: params.email || '',
        CounterpartyType: params.counterpartyType || 'PrivatePerson',
        CounterpartyProperty: params.counterpartyProperty || 'Recipient'
      },
    });

    console.log('Create counterparty request:', {
      FirstName: params.firstName,
      MiddleName: params.middleName,
      LastName: params.lastName,
      Phone: params.phone,
      Email: params.email || '',
      CounterpartyType: params.counterpartyType || 'PrivatePerson',
      CounterpartyProperty: params.counterpartyProperty || 'Recipient'
    });

    if (!response.success) {
      console.error('Nova Poshta API error creating counterparty:', response.errors);
      throw new Error(`Nova Poshta API error: ${this.formatErrorMessage(response.errors)}`);
    }

    return response.data[0];
  }

  /**
   * Create an Internet Document (TTN)
   */
  async createInternetDocument(params: {
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
  }): Promise<NovaPoshtaInternetDocument> {
    const response = await this.makeRequest<NovaPoshtaInternetDocument>({
      modelName: 'InternetDocumentGeneral',
      calledMethod: 'save',
      methodProperties: {
        PayerType: params.payerType,
        PaymentMethod: params.paymentMethod,
        CargoType: params.cargoType,
        Weight: params.weight.toString(),
        ServiceType: params.serviceType,
        SeatsAmount: params.seatsAmount.toString(),
        Description: params.description,
        Cost: params.cost.toString(),
        CitySender: params.senderCityRef,
        Sender: params.senderRef,
        SenderAddress: params.senderAddressRef,
        ContactSender: params.contactSender,
        SendersPhone: params.senderPhone,
        CityRecipient: params.recipientCityRef,
        Recipient: params.recipientRef,
        RecipientAddress: params.recipientAddressRef,
        ContactRecipient: params.contactRecipient,
        RecipientsPhone: params.recipientPhone,
        VolumeGeneral: params.volumeGeneral?.toString(),
        ...(params.length && params.width && params.height ? {
          Length: params.length.toString(),
          Width: params.width.toString(),
          Height: params.height.toString(),
        } : {}),
      },
    });

    if (!response.success) {
      throw new Error(`Nova Poshta API error: ${this.formatErrorMessage(response.errors)}`);
    }

    return response.data[0];
  }

  /**
   * Get document list
   */
  async getDocumentList(dateFrom: string, dateTo: string, page = 1): Promise<NovaPoshtaDocumentListItem[]> {
    const response = await this.makeRequest<NovaPoshtaDocumentListItem>({
      modelName: 'InternetDocumentGeneral',
      calledMethod: 'getDocumentList',
      methodProperties: {
        DateTimeFrom: dateFrom,
        DateTimeTo: dateTo,
        Page: page.toString(),
      },
    });

    if (!response.success) {
      throw new Error(`Nova Poshta API error: ${this.formatErrorMessage(response.errors)}`);
    }

    return response.data;
  }

  /**
   * Get document info
   */
  async getDocumentInfo(documentRef: string): Promise<NovaPoshtaDocumentInfo> {
    const response = await this.makeRequest<NovaPoshtaDocumentInfo>({
      modelName: 'InternetDocumentGeneral',
      calledMethod: 'getDocumentInfo',
      methodProperties: {
        Ref: documentRef,
      },
    });

    if (!response.success) {
      throw new Error(`Nova Poshta API error: ${this.formatErrorMessage(response.errors)}`);
    }

    return response.data[0];
  }

  /**
   * Track a document
   */
  async trackDocument(documentNumber: string): Promise<NovaPoshtaTrackingInfo> {
    const response = await this.makeRequest<NovaPoshtaTrackingInfo>({
      modelName: 'TrackingDocument',
      calledMethod: 'getStatusDocuments',
      methodProperties: {
        Documents: [
          {
            DocumentNumber: documentNumber,
          },
        ],
      },
    });

    if (!response.success) {
      throw new Error(`Nova Poshta API error: ${this.formatErrorMessage(response.errors)}`);
    }

    return response.data[0];
  }

  /**
   * Create a contact person for a counterparty
   * 
   * Creates a new contact person for the specified counterparty.
   * Note: Data must be entered in Ukrainian language only.
   */
  async createContactPerson(params: NovaPoshtaContactPersonCreationParams): Promise<NovaPoshtaContactPerson> {
    console.log('Creating contact person with params:', params);
    
    const response = await this.makeRequest<NovaPoshtaContactPerson>({
      modelName: 'ContactPersonGeneral',
      calledMethod: 'save',
      methodProperties: {
        CounterpartyRef: params.counterpartyRef,
        FirstName: params.firstName,
        LastName: params.lastName,
        MiddleName: params.middleName,
        Phone: params.phone
      },
    });

    console.log('Create contact person response:', response);

    if (!response.success) {
      console.error('Nova Poshta API error creating contact person:', response.errors);
      throw new Error(`Nova Poshta API error: ${this.formatErrorMessage(response.errors)}`);
    }

    return response.data[0];
  }

  /**
   * Delete an Internet Document (TTN)
   * 
   * Deletes an existing Internet Document using its reference ID.
   */
  async deleteInternetDocument(documentRef: string): Promise<{ success: boolean; error?: string; errorType?: 'not_found' | 'permission' | 'unknown'; rawError?: unknown }> {
    console.log('🗑️ Deleting Internet Document with ref:', documentRef);
    
    const response = await this.makeRequest<{ Ref: string }>({
      modelName: 'InternetDocumentGeneral',
      calledMethod: 'delete',
      methodProperties: {
        DocumentRefs: documentRef
      },
    });

    console.log('🗑️ Delete Internet Document response:', response);

    if (!response.success) {
      console.error('❌ Nova Poshta API error deleting Internet Document:', response.errors);
      
      const errorMessage = this.formatErrorMessage(response.errors);
      const errorType = this.categorizeError(response.errors);
      
      return {
        success: false,
        error: errorMessage,
        errorType,
        rawError: response.errors
      };
    }

    return { success: true };
  }

  /**
   * Categorize Nova Poshta API errors for better handling
   */
  private categorizeError(errors: unknown): 'not_found' | 'permission' | 'unknown' {
    const errorString = this.formatErrorMessage(errors).toLowerCase();
    
    if (errorString.includes('document not found') || 
        errorString.includes('not found by owner') ||
        errorString.includes('no document changed deletionmark')) {
      return 'not_found';
    }
    
    if (errorString.includes('permission') || 
        errorString.includes('access') ||
        errorString.includes('unauthorized')) {
      return 'permission';
    }
    
    return 'unknown';
  }
}

// Create and export a singleton instance
let novaPoshtaService: NovaPoshtaService | null = null;

/**
 * Initialize the Nova Poshta service with an API key
 */
export function initNovaPoshtaService(apiKey: string): NovaPoshtaService {
  novaPoshtaService = new NovaPoshtaService(apiKey);
  return novaPoshtaService;
}

/**
 * Get the Nova Poshta service instance
 */
export function getNovaPoshtaService(): NovaPoshtaService {
  if (!novaPoshtaService) {
    throw new Error('Nova Poshta service not initialized. Call initNovaPoshtaService first.');
  }
  return novaPoshtaService;
}
