"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/app/components/shared/ui/button";
import { Input } from "@/app/components/shared/ui/input"
import { Label } from "@/app/components/shared/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/shared/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/app/components/shared/ui/dialog"
import { Textarea } from "@/app/components/shared/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { ChevronLeft, ChevronRight, Loader2, Search, ChevronsUpDown, Info } from "lucide-react"
import { NovaPoshtaSettlement, NovaPoshtaWarehouse } from "@/app/lib/services/nova-poshta"
import { toast } from "sonner"
import { ScrollArea } from "@/app/components/shared/ui/scroll-area"
import { searchSettlements, getWarehouses, createInternetDocument, getCounterparties, getCounterpartyContactPersons, createCounterparty, createContactPerson, deleteInternetDocument } from '@/app/[locale]/orders/actions/nova-poshta';
import { cn } from "@/app/lib/utils"

interface Order {
  id: string
  customerName: string
  customerPhone: string
  customerEmail: string
  totalAmount: number
  deliveryPostNumber?: string
}

// Define a proper type for the Nova Poshta invoice data
interface NovaPoshtaInvoiceData {
  Ref: string;
  CostOnSite?: string;
  EstimatedDeliveryDate?: string;
  IntDocNumber: string;
  TypeDocument?: string;
  // Allow for other properties that might be in the response
  [key: string]: string | number | boolean | null | undefined;
}

interface NovaPoshtaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order
  onTtnCreated?: (ttnNumber: string, documentRef: string, invoiceData: NovaPoshtaInvoiceData) => void
  onTtnDeleted?: () => void
  existingTtn?: {
    number: string
    documentRef: string
  }
}

type NovaPoshtaStep = "sender" | "recipient" | "package" | "review"

// Service type options
const SERVICE_TYPES = [
  { value: "WarehouseWarehouse", label: "Warehouse to Warehouse" },
  { value: "WarehouseDoors", label: "Warehouse to Doors" },
  { value: "DoorsWarehouse", label: "Doors to Warehouse" },
  { value: "DoorsDoors", label: "Doors to Doors" },
];

// Cargo types
const CARGO_TYPES = [
  { value: "Cargo", label: "Cargo" },
  { value: "Documents", label: "Documents" },
  { value: "TiresWheels", label: "Tires/Wheels" },
  { value: "Pallet", label: "Pallet" },
];

// Payment types
const PAYMENT_TYPES = [
  { value: "Cash", label: "Cash" },
  { value: "NonCash", label: "Non-Cash" },
];

// Payer types
const PAYER_TYPES = [
  { value: "Sender", label: "Sender" },
  { value: "Recipient", label: "Recipient" },
  { value: "ThirdPerson", label: "Third Person" },
];

// Add type for raw Nova Poshta API settlement response
interface RawNovaPoshtaSettlement {
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

interface NovaPoshtaContactPerson {
  Ref: string;
  Description: string;
  FirstName: string;
  LastName: string;
  MiddleName: string;
  Phones: string;
}

interface NovaPoshtaCounterparty {
  Ref: string;
  Description: string;
  FirstName: string;
  LastName: string;
  MiddleName: string;
  EDRPOU: string;
  CounterpartyType: string;
}

export function NovaPoshtaModal({ 
  open, 
  onOpenChange, 
  order, 
  onTtnDeleted,
  existingTtn 
}: NovaPoshtaModalProps) {
  const [currentStep, setCurrentStep] = useState<NovaPoshtaStep>("sender")
  const [loading, setLoading] = useState(false)
  const [searchingCities, setSearchingCities] = useState(false)
  const [searchingWarehouses, setSearchingWarehouses] = useState(false)
  const [senderCities, setSenderCities] = useState<NovaPoshtaSettlement[]>([])
  const [senderWarehouses, setSenderWarehouses] = useState<NovaPoshtaWarehouse[]>([])
  const [recipientCities, setRecipientCities] = useState<NovaPoshtaSettlement[]>([])
  const [recipientWarehouses, setRecipientWarehouses] = useState<NovaPoshtaWarehouse[]>([])
  const [senderCityOpen, setSenderCityOpen] = useState(false)
  const [recipientCityOpen, setRecipientCityOpen] = useState(false)
  const [senderWarehouseOpen, setSenderWarehouseOpen] = useState(false)
  const [recipientWarehouseOpen, setRecipientWarehouseOpen] = useState(false)
  const [senderWarehouseSearchValue, setSenderWarehouseSearchValue] = useState("")
  const [recipientWarehouseSearchValue, setRecipientWarehouseSearchValue] = useState("")
  const [senders, setSenders] = useState<NovaPoshtaCounterparty[]>([])
  const [contactPersons, setContactPersons] = useState<NovaPoshtaContactPerson[]>([])
  const [loadingSenders, setLoadingSenders] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [senderSearchValue, setSenderSearchValue] = useState("")
  const [senderOpen, setSenderOpen] = useState(false)
  
  // Add new state for recipient counterparties
  const [recipients, setRecipients] = useState<NovaPoshtaCounterparty[]>([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [recipientSearchValue, setRecipientSearchValue] = useState(order.customerName || "")
  const [recipientOpen, setRecipientOpen] = useState(false)
  
  const [recipientContactPersons, setRecipientContactPersons] = useState<NovaPoshtaContactPerson[]>([])
  const [loadingRecipientContacts, setLoadingRecipientContacts] = useState(false)
  
  const [recipientContactOpen, setRecipientContactOpen] = useState(false)
  const [recipientContactSearchValue, setRecipientContactSearchValue] = useState("")
  const recipientContactRef = useRef<HTMLDivElement>(null);
  
  const senderWarehouseRef = useRef<HTMLDivElement>(null);
  const recipientWarehouseRef = useRef<HTMLDivElement>(null);
  const senderRef = useRef<HTMLDivElement>(null);
  const recipientRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    // Sender details
    senderCity: "",
    senderCityRef: "",
    senderWarehouse: "",
    senderWarehouseRef: "",
    senderRef: "",
    senderDescription: "",
    senderAddressRef: "",
    senderContact: "",
    senderContactRef: "",

    // Recipient details
    recipientName: order.customerName,
    recipientPhone: order.customerPhone,
    recipientCity: "",
    recipientCityRef: "",
    recipientWarehouse: "",
    recipientWarehouseRef: "",
    recipientRef: "",
    recipientDescription: "",
    recipientAddressRef: "",

    // Package details
    weight: "0.5",
    length: "",
    width: "",
    height: "",
    seatsAmount: "1",
    cargoType: "Cargo",
    cost: order.totalAmount.toString(),

    // Payment details
    paymentMethod: "Cash",
    payerType: "Recipient",
    serviceType: "WarehouseWarehouse",

    // Additional
    description: "",

    // New fields
    recipientContactRef: "",
    recipientContact: "",
  })
  
  const [creatingCounterparty, setCreatingCounterparty] = useState(false);
  const [creatingContactPerson, setCreatingContactPerson] = useState(false)
  const [showFormatInfo, setShowFormatInfo] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  
  // Add state for editable name fields in the create recipient modal
  const [editableNames, setEditableNames] = useState({
    firstName: "",
    lastName: "",
    middleName: ""
  })
  
  // Add a state to store sender contact person's phone
  const [senderPhone, setSenderPhone] = useState<string>("");
  
  // Add state to track deletion process
  const [deletingTtn, setDeletingTtn] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Initialize Nova Poshta service
  useEffect(() => {
    // No need to initialize here as we're using server actions
  }, []);

  // Initialize with loading senders
  useEffect(() => {
    fetchSenders();
  }, []);

  // Initialize with loading recipients based on customer name
  useEffect(() => {
    if (order.customerName) {
      fetchRecipients(order.customerName);
    }
  }, [order.customerName]);
  
  // When sender is selected, fetch their contact persons
  useEffect(() => {
    if (formData.senderRef) {
      fetchContactPersons(formData.senderRef);
    } else {
      setContactPersons([]);
    }
  }, [formData.senderRef]);

  // When recipient is selected, fetch their contact persons
  useEffect(() => {
    if (formData.recipientRef) {
      fetchRecipientContactPersons(formData.recipientRef, recipientContactSearchValue);
    } else {
      setRecipientContactPersons([]);
    }
  }, [formData.recipientRef, recipientContactSearchValue]);

  // When sender contact is selected, fetch their phone number
  useEffect(() => {
    if (formData.senderContactRef && contactPersons.length > 0) {
      const selectedContact = contactPersons.find(contact => contact.Ref === formData.senderContactRef);
      if (selectedContact && selectedContact.Phones) {
        setSenderPhone(selectedContact.Phones);
      }
    }
  }, [formData.senderContactRef, contactPersons]);

  // Initialize editable names when confirmation dialog opens
  useEffect(() => {
    if (showConfirmation && formData.recipientName) {
      const { firstName, middleName, lastName } = parseCustomerName(formData.recipientName);
      setEditableNames({
        firstName: firstName || "",
        lastName: lastName || "",
        middleName: middleName || ""
      });
    }
  }, [showConfirmation, formData.recipientName]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close sender warehouse dropdown if clicked outside
      if (senderWarehouseRef.current && 
          !senderWarehouseRef.current.contains(event.target as Node) && 
          senderWarehouseOpen) {
        setSenderWarehouseOpen(false);
      }
      
      // Close recipient warehouse dropdown if clicked outside
      if (recipientWarehouseRef.current && 
          !recipientWarehouseRef.current.contains(event.target as Node) && 
          recipientWarehouseOpen) {
        setRecipientWarehouseOpen(false);
      }
      
      // Close sender dropdown if clicked outside
      if (senderRef.current && 
          !senderRef.current.contains(event.target as Node) && 
          senderOpen) {
        setSenderOpen(false);
      }
      
      // Close recipient dropdown if clicked outside
      if (recipientRef.current && 
          !recipientRef.current.contains(event.target as Node) && 
          recipientOpen) {
        setRecipientOpen(false);
      }
      
      // Close recipient contact dropdown if clicked outside
      if (recipientContactRef.current && 
          !recipientContactRef.current.contains(event.target as Node) && 
          recipientContactOpen) {
        setRecipientContactOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [senderWarehouseOpen, recipientWarehouseOpen, senderOpen, recipientOpen, recipientContactOpen]);

  const steps = [
    { id: "sender", title: "Sender" },
    { id: "recipient", title: "Recipient" },
    { id: "package", title: "Package" },
    { id: "review", title: "Review & Pay" },
  ]

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep)

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id as NovaPoshtaStep)
    }
  }

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id as NovaPoshtaStep)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Validate required fields for sender
      if (!formData.senderRef || !formData.senderCityRef || !formData.senderWarehouseRef || !formData.senderContactRef) {
        throw new Error("Please fill in all required sender fields");
      }
      
      // Validate sender phone
      if (!senderPhone) {
        throw new Error("Sender phone number is missing. Please select a different contact person.");
      }
      
      // Validate required fields for recipient
      if (!formData.recipientName || !formData.recipientPhone || !formData.recipientCityRef || !formData.recipientWarehouseRef) {
        throw new Error("Please fill in all required recipient fields");
      }
      
      // Validate package details
      if (!formData.weight || !formData.cargoType || !formData.seatsAmount) {
        throw new Error("Please fill in all required package details");
      }
      
      // Create the TTN (Internet Document) using the server action
      const result = await createInternetDocument({
        orderId: order.id,
        senderCityRef: formData.senderCityRef,
        recipientCityRef: formData.recipientCityRef,
        senderRef: formData.senderRef,
        recipientRef: formData.recipientRef || "00000000-0000-0000-0000-000000000000", // Use actual recipientRef when available
        contactSender: formData.senderContactRef,
        contactRecipient: formData.recipientContactRef || "00000000-0000-0000-0000-000000000000", // Use selected recipient contact or default
        senderAddressRef: formData.senderAddressRef || formData.senderWarehouseRef,
        recipientAddressRef: formData.recipientAddressRef || formData.recipientWarehouseRef,
        weight: parseFloat(formData.weight),
        cost: parseFloat(formData.cost),
        serviceType: formData.serviceType,
        payerType: formData.payerType,
        paymentMethod: formData.paymentMethod,
        description: formData.description || "Order " + order.id,
        seatsAmount: parseInt(formData.seatsAmount),
        cargoType: formData.cargoType,
        recipientPhone: formData.recipientPhone,
        recipientFullName: formData.recipientName,
        senderPhone: senderPhone, // Add the sender phone
        volumeGeneral: formData.length && formData.width && formData.height ? 
          (parseFloat(formData.length) * parseFloat(formData.width) * parseFloat(formData.height)) / 1000000 : undefined,
        length: formData.length ? parseFloat(formData.length) : undefined,
        width: formData.width ? parseFloat(formData.width) : undefined,
        height: formData.height ? parseFloat(formData.height) : undefined,
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (!result.data) {
        throw new Error("Failed to create TTN");
      }
      
      console.log("TTN created successfully:", result.data);
      toast.success(`TTN created successfully: ${result.data.IntDocNumber}`);
      
      onOpenChange(false)
      // Reset to first step for next time
      setTimeout(() => setCurrentStep("sender"), 300)
    } catch (error) {
      console.error("Failed to create Nova Poshta invoice:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create TTN");
    } finally {
      setLoading(false)
    }
  }

  const searchCities = async (query: string, type: 'sender' | 'recipient') => {
    if (query.length < 2) return
    setSearchingCities(true)
    try {
      console.log(`Searching for city: ${query}`);
      const result = await searchSettlements(query);
      
      console.log('Search results:', result);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.data) {
        console.log(`Found ${result.data.length} cities for query: ${query}`);
        // Check if data is in the expected format
        const hasExpectedFormat = result.data.length > 0 && 'Description' in result.data[0];
        
        if (hasExpectedFormat) {
          // Data is already in the expected NovaPoshtaSettlement format
          if (type === 'sender') {
            setSenderCities(result.data)
          } else {
            setRecipientCities(result.data)
          }
        } else {
          // Data is in the raw API format - need to transform it
          // This handles the case where the server action hasn't transformed the data
          const mappedData = result.data.map((item: RawNovaPoshtaSettlement) => ({
            Description: item.Present || item.MainDescription,
            Ref: item.Ref,
            AreaDescription: item.Area,
            SettlementType: item.SettlementTypeCode || '',
            Area: item.Area || '',
            Region: item.Region || '',
            RegionsDescription: item.Region || ''
          }));
          
          if (type === 'sender') {
            setSenderCities(mappedData)
          } else {
            setRecipientCities(mappedData)
          }
        }
      } else {
        console.log('No data returned from search');
        // Clear previous results if no data
        if (type === 'sender') {
          setSenderCities([])
        } else {
          setRecipientCities([])
        }
      }
    } catch (error) {
      console.error("Failed to search cities:", error)
      toast.error(error instanceof Error ? error.message : "Failed to search cities");
      // Clear results on error
      if (type === 'sender') {
        setSenderCities([])
      } else {
        setRecipientCities([])
      }
    } finally {
      setSearchingCities(false)
    }
  }

  const searchWarehouses = async (cityRef: string, type: 'sender' | 'recipient') => {
    if (!cityRef) return
    setSearchingWarehouses(true)
    try {
      console.log(`Searching for warehouses in city: ${cityRef}`);
      const result = await getWarehouses(cityRef);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.data) {
        if (type === 'sender') {
          setSenderWarehouses(result.data)
        } else {
          setRecipientWarehouses(result.data)
        }
      }
    } catch (error) {
      console.error("Failed to search warehouses:", error)
      toast.error(error instanceof Error ? error.message : "Failed to search warehouses");
    } finally {
      setSearchingWarehouses(false)
    }
  }

  const handleSelectCity = (city: NovaPoshtaSettlement, type: 'sender' | 'recipient') => {
    if (type === 'sender') {
      setFormData((prev) => ({ 
        ...prev, 
        senderCity: city.Description,
        senderCityRef: city.Ref,
        senderWarehouse: "", // Reset warehouse when city changes
        senderWarehouseRef: "" 
      }))
      setSenderCityOpen(false)
      // Fetch warehouses for this city
      searchWarehouses(city.Ref, 'sender')
    } else {
      setFormData((prev) => ({ 
        ...prev, 
        recipientCity: city.Description,
        recipientCityRef: city.Ref,
        recipientWarehouse: "", // Reset warehouse when city changes
        recipientWarehouseRef: "" 
      }))
      setRecipientCityOpen(false)
      // Fetch warehouses for this city
      searchWarehouses(city.Ref, 'recipient')
    }
  }

  const handleSelectWarehouse = (warehouse: NovaPoshtaWarehouse, type: 'sender' | 'recipient') => {
    if (type === 'sender') {
      setFormData((prev) => ({ 
        ...prev, 
        senderWarehouse: warehouse.Description,
        senderWarehouseRef: warehouse.Ref 
      }))
    } else {
      setFormData((prev) => ({ 
        ...prev, 
        recipientWarehouse: warehouse.Description,
        recipientWarehouseRef: warehouse.Ref 
      }))
    }
  }

  // Fetch senders from Nova Poshta API
  const fetchSenders = async (searchQuery: string = "") => {
    setLoadingSenders(true);
    try {
      const result = await getCounterparties('Sender', 1, searchQuery);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.data) {
        setSenders(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch senders:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch senders");
    } finally {
      setLoadingSenders(false);
    }
  };
  
  // Fetch contact persons for a selected sender
  const fetchContactPersons = async (senderRef: string) => {
    if (!senderRef) return;
    
    setLoadingContacts(true);
    try {
      const result = await getCounterpartyContactPersons(senderRef);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.data) {
        setContactPersons(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch contact persons:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch contact persons");
    } finally {
      setLoadingContacts(false);
    }
  };
  
  // Handle sender selection
  const handleSelectSender = (sender: NovaPoshtaCounterparty) => {
    setFormData((prev) => ({
      ...prev,
      senderRef: sender.Ref,
      senderDescription: sender.Description,
      senderContact: "", // Reset contact when sender changes
      senderContactRef: ""
    }));
    setSenderOpen(false);
  };

  // Parse customer name into first, middle, and last name
  const parseCustomerName = (name: string) => {
    // Assuming format is "Lastname Firstname Middlename" (common Ukrainian format)
    const parts = name.trim().split(/\s+/);
    
    if (parts.length === 3) {
      return {
        lastName: parts[0],
        firstName: parts[1],
        middleName: parts[2]
      };
    } else if (parts.length === 2) {
      return {
        lastName: parts[0],
        firstName: parts[1],
        middleName: ""
      };
    } else if (parts.length === 1) {
      return {
        lastName: parts[0],
        firstName: "",
        middleName: ""
      };
    } else if (parts.length > 3) {
      // If more than 3 parts, assume the first is lastname, second is firstname, rest is middlename
      return {
        lastName: parts[0],
        firstName: parts[1],
        middleName: parts.slice(2).join(" ")
      };
    }
    
    // Default case
    return {
      lastName: name,
      firstName: "",
      middleName: ""
    };
  };

  // Format the name in the required format
  const formatCounterpartyName = (lastName: string, firstName: string, middleName: string) => {
    return `${lastName} ${firstName} ${middleName}`.trim();
  };

  // Fetch recipients from Nova Poshta API
  const fetchRecipients = async (searchQuery: string = "") => {
    if (searchQuery.length < 2) {
      toast.warning("Search query must be at least 2 characters");
      return;
    }
    
    setLoadingRecipients(true);
    try {
      console.log(`Searching for recipients with query: "${searchQuery}"`);
      
      const result = await getCounterparties('Recipient', 1, searchQuery);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.data) {
        setRecipients(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch recipients:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch recipients");
      setRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  };
  
  // Show confirmation dialog before creating counterparty
  const showCounterpartyConfirmation = () => {
    if (!formData.recipientName || !formData.recipientPhone) {
      toast.error("Recipient name and phone are required to create a new counterparty");
      return;
    }
    
    setShowConfirmation(true);
  };
  
  // Fetch contact persons for a selected recipient
  const fetchRecipientContactPersons = async (recipientRef: string, searchQuery: string = "") => {
    if (!recipientRef) return;
    
    setLoadingRecipientContacts(true);
    try {
      const result = await getCounterpartyContactPersons(recipientRef);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.data) {
        // Filter contacts by search query if provided
        let contacts = result.data;
        if (searchQuery) {
          contacts = contacts.filter(contact => 
            contact.Description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contact.FirstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contact.LastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (contact.MiddleName && contact.MiddleName.toLowerCase().includes(searchQuery.toLowerCase()))
          );
        }
        
        setRecipientContactPersons(contacts);
        
        // If only one contact person, select it automatically
        if (contacts.length === 1) {
          setFormData((prev) => ({ 
            ...prev, 
            recipientContactRef: contacts[0].Ref,
            recipientContact: contacts[0].Description 
          }));
          setRecipientContactOpen(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch recipient contact persons:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch recipient contact persons");
    } finally {
      setLoadingRecipientContacts(false);
    }
  };
  
  // Handle recipient selection
  const handleSelectRecipient = (recipient: NovaPoshtaCounterparty) => {
    // Create a full name description from the recipient's name fields if needed
    const fullName = recipient.Description === "Приватна особа" || !recipient.Description.includes(recipient.LastName) 
      ? `${recipient.LastName} ${recipient.FirstName} ${recipient.MiddleName}`.trim()
      : recipient.Description;
    
    // Pre-fill the contact search with the recipient name  
    setRecipientContactSearchValue(fullName);
    
    setFormData((prev) => ({
      ...prev,
      recipientRef: recipient.Ref,
      recipientDescription: fullName,
      recipientName: fullName,
      recipientContactRef: "", // Reset contact when recipient changes
      recipientContact: "" 
    }));
    
    // Automatically fetch contact persons for this recipient
    fetchRecipientContactPersons(recipient.Ref, "");
    
    setRecipientOpen(false);
  };

  // Handle recipient contact selection
  const handleSelectRecipientContact = (contact: NovaPoshtaContactPerson) => {
    setFormData((prev) => ({ 
      ...prev, 
      recipientContactRef: contact.Ref,
      recipientContact: contact.Description 
    }));
    setRecipientContactOpen(false);
  };

  // Create a new counterparty if one doesn't exist
  const handleCreateCounterparty = async () => {
    // Use the editable names instead of parsing again
    const { firstName, middleName, lastName } = editableNames;
    
    if (!lastName || !formData.recipientPhone) {
      toast.error("Recipient name and phone are required to create a new counterparty");
      return;
    }
    
    setCreatingCounterparty(true);
    setShowConfirmation(false);
    
    try {
      // Ensure phone number is properly formatted
      let phone = formData.recipientPhone.trim();
      if (phone.startsWith('+')) {
        phone = phone.substring(1);
      }
      // Ensure Ukrainian format with 380 prefix
      if (phone.startsWith('0') && !phone.startsWith('380')) {
        phone = '38' + phone;
      }
      
      const result = await createCounterparty({
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        phone: phone,
        email: order.customerEmail || "",
        counterpartyType: "PrivatePerson",
        counterpartyProperty: "Recipient"
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.data) {
        toast.success("Recipient created successfully");
        
        // Create a proper full name from the name parts in the required format
        const fullName = formatCounterpartyName(result.data.LastName, result.data.FirstName, result.data.MiddleName);
        
        // Set the created counterparty as the selected recipient
        setFormData((prev) => ({
          ...prev,
          recipientRef: result.data.Ref,
          recipientDescription: fullName,
          recipientName: fullName
        }));
        
        // Add the new counterparty to the recipients list
        setRecipients([
          {
            Ref: result.data.Ref,
            Description: fullName, // Use our constructed full name instead of API description
            FirstName: result.data.FirstName,
            LastName: result.data.LastName,
            MiddleName: result.data.MiddleName,
            EDRPOU: result.data.EDRPOU || "",
            CounterpartyType: result.data.CounterpartyType
          },
          ...recipients
        ]);
        
        // Automatically fetch contact persons for this new recipient
        fetchRecipientContactPersons(result.data.Ref, "");
        
        setRecipientOpen(false);
      }
    } catch (error) {
      console.error("Failed to create counterparty:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create counterparty");
    } finally {
      setCreatingCounterparty(false);
    }
  };

  // Create a new contact person if one doesn't exist
  const handleCreateContactPerson = async () => {
    if (!formData.recipientRef) {
      toast.error("Please select a recipient first");
      return;
    }

    if (!formData.recipientName) {
      toast.error("Recipient name is required to create a contact person");
      return;
    }
    
    const { firstName, middleName, lastName } = parseCustomerName(formData.recipientName);
    
    if (!lastName) {
      toast.error("Recipient last name is required to create a contact person");
      return;
    }
    
    if (!formData.recipientPhone) {
      toast.error("Recipient phone is required to create a contact person");
      return;
    }
    
    setCreatingContactPerson(true);
    
    try {
      const result = await createContactPerson({
        counterpartyRef: formData.recipientRef,
        firstName: firstName || "Ім'я",  // Provide default if empty
        lastName,
        middleName: middleName || "По-батькові", // Provide default if empty
        phone: formData.recipientPhone
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.data) {
        toast.success("Contact person created successfully");
        
        // Set the created contact person as the selected contact
        setFormData((prev) => ({
          ...prev,
          recipientContactRef: result.data.Ref,
          recipientContact: result.data.Description
        }));
        
        // Add the new contact to the contacts list
        setRecipientContactPersons([
          {
            Ref: result.data.Ref,
            Description: result.data.Description,
            FirstName: result.data.FirstName,
            LastName: result.data.LastName,
            MiddleName: result.data.MiddleName,
            Phones: result.data.Phones
          },
          ...recipientContactPersons
        ]);
        
        setRecipientContactOpen(false);
      }
    } catch (error) {
      console.error("Failed to create contact person:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create contact person");
    } finally {
      setCreatingContactPerson(false);
    }
  };

  // Add a function to handle TTN deletion
  const handleDeleteTtn = async () => {
    if (!existingTtn?.documentRef) {
      toast.error("No invoice reference found to delete");
      return;
    }
    
    setDeletingTtn(true);
    try {
      const result = await deleteInternetDocument(existingTtn.documentRef);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.success) {
        toast.success("Nova Poshta invoice deleted successfully");
        if (onTtnDeleted) {
          onTtnDeleted();
        }
        onOpenChange(false);
      } else {
        throw new Error("Failed to delete Nova Poshta invoice");
      }
    } catch (error) {
      console.error("Failed to delete Nova Poshta invoice:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete invoice");
    } finally {
      setDeletingTtn(false);
      setShowDeleteConfirmation(false);
    }
  };

  const renderSenderStep = () => (
    <Card className="border-none shadow-none">
      <CardHeader className="px-4 pb-3">
        <CardTitle className="text-lg">Sender Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-4">
        <div className="space-y-2">
          <Label htmlFor="sender">Sender *</Label>
          <div className="relative" ref={senderRef}>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              className="w-full justify-between"
              onClick={() => {
                setSenderOpen(!senderOpen);
                if (!senders.length) {
                  fetchSenders();
                }
              }}
            >
              {formData.senderDescription || "Select sender..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
            
            {senderOpen && (
              <div className="absolute z-50 w-full bg-background border rounded-md shadow-md mt-1">
                <div className="flex items-center border-b px-3 py-2">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    placeholder="Search senders..."
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={senderSearchValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSenderSearchValue(value);
                      if (value.length >= 2) {
                        fetchSenders(value);
                      }
                    }}
                    autoFocus
                  />
                </div>
                <ScrollArea className="max-h-[300px]">
                  <div className="py-2">
                    {loadingSenders ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : senders.length === 0 ? (
                      <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                        No senders found
                      </div>
                    ) : (
                      senders.map((sender) => (
                        <div
                          key={sender.Ref}
                          className={cn(
                            "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                            formData.senderRef === sender.Ref && "bg-accent text-accent-foreground"
                          )}
                          onClick={() => handleSelectSender(sender)}
                        >
                          {sender.Description}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="senderCity">Sender City *</Label>
            <div className="relative">
              <Input
                id="senderCity"
                placeholder="Search city..."
                value={formData.senderCity || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData((prev) => ({ ...prev, senderCity: value }));
                  if (value.length >= 2) {
                    searchCities(value, 'sender');
                    setSenderCityOpen(true);
                  } else {
                    setSenderCityOpen(false);
                  }
                }}
                className="w-full"
                autoComplete="off"
                disabled={!formData.senderRef}
              />
              {searchingCities && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
              
              {senderCityOpen && senderCities.length > 0 && (
                <div className="absolute z-[100] w-full bg-background border rounded-md shadow-md mt-1 max-h-[300px] overflow-y-auto">
                  <div className="p-1">
                    {senderCities.map((city) => (
                      <div
                        key={city.Ref}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground mb-1"
                        onClick={() => handleSelectCity(city, 'sender')}
                      >
                        {city.Description} ({city.AreaDescription})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {!formData.senderRef && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Select a sender first</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="senderWarehouse">Sender Warehouse *</Label>
            <div className="relative" ref={senderWarehouseRef}>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className="w-full justify-between"
                disabled={!formData.senderCityRef}
                onClick={() => setSenderWarehouseOpen(!senderWarehouseOpen)}
              >
                {formData.senderWarehouse || "Select warehouse..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
              
              {senderWarehouseOpen && (
                <div className="absolute z-50 w-full bg-background border rounded-md shadow-md mt-1">
                  <div className="flex items-center border-b px-3 py-2">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <Input
                      placeholder="Search warehouses..."
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      value={senderWarehouseSearchValue}
                      onChange={(e) => setSenderWarehouseSearchValue(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <ScrollArea className="max-h-[300px]">
                    <div className="py-2">
                      {senderWarehouses
                        .filter(warehouse => 
                          warehouse.Description.toLowerCase().includes(senderWarehouseSearchValue.toLowerCase()) || 
                          (warehouse.Number && warehouse.Number.toLowerCase().includes(senderWarehouseSearchValue.toLowerCase()))
                        )
                        .map((warehouse) => (
                          <div
                            key={warehouse.Ref}
                            className={cn(
                              "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                              formData.senderWarehouseRef === warehouse.Ref && "bg-accent text-accent-foreground"
                            )}
                            onClick={() => {
                              handleSelectWarehouse(warehouse, 'sender');
                              setSenderWarehouseOpen(false);
                            }}
                          >
                            {warehouse.Description}
                            {warehouse.Number && ` (№${warehouse.Number})`}
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
            {searchingWarehouses && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {!formData.senderCityRef && formData.senderRef && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Select a city first</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="senderContact">Sender Contact Person *</Label>
          {loadingContacts ? (
            <div className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Loading contacts...</span>
            </div>
          ) : !formData.senderRef ? (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Select a sender first
            </div>
          ) : contactPersons.length === 0 ? (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              No contact persons found for this sender
            </div>
          ) : (
            <Select
              value={formData.senderContactRef}
              onValueChange={(value) => {
                const selectedContact = contactPersons.find(contact => contact.Ref === value);
                setFormData((prev) => ({ 
                  ...prev, 
                  senderContactRef: value,
                  senderContact: selectedContact ? selectedContact.Description : ""
                }));
              }}
              disabled={!formData.senderRef}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select contact person" />
              </SelectTrigger>
              <SelectContent>
                {contactPersons.map((contact) => (
                  <SelectItem key={contact.Ref} value={contact.Ref}>
                    {contact.Description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const renderRecipientStep = () => (
    <Card className="border-none shadow-none">
      <CardHeader className="px-4 pb-3">
        <CardTitle className="text-lg">Recipient Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="recipientName">Recipient * 
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 ml-1" 
                  onClick={() => setShowFormatInfo(!showFormatInfo)}
                >
                  <Info className="h-4 w-4" />
                </Button>
                <span className="text-xs ml-1 text-gray-500 dark:text-gray-400">(requires Last Name First Name Middle Name)</span>
              </Label>
            </div>
            {showFormatInfo && (
              <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-2 rounded-md mb-2">
                Format should be: <strong>Last Name First Name Middle Name</strong><br />
                Example: <strong>Шевченко Тарас Григорович</strong><br/>
                <span className="text-red-500 font-semibold">Middle name is required by Nova Poshta</span>
              </div>
            )}
            <div className="relative" ref={recipientRef}>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className="w-full justify-between"
                onClick={() => {
                  setRecipientOpen(!recipientOpen);
                  if (recipientSearchValue && recipients.length === 0) {
                    fetchRecipients(recipientSearchValue);
                  }
                }}
              >
                {formData.recipientDescription || formData.recipientName || "Select recipient..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
              
              {recipientOpen && (
                <div className="absolute z-50 w-full bg-background border rounded-md shadow-md mt-1">
                  <div className="flex items-center border-b px-3 py-2">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <Input
                      placeholder="Search recipients..."
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      value={recipientSearchValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRecipientSearchValue(value);
                        setFormData((prev) => ({ ...prev, recipientName: value }));
                        if (value.length >= 2) {
                          fetchRecipients(value);
                        }
                      }}
                      autoFocus
                    />
                  </div>
                  <ScrollArea className="max-h-[300px]">
                    <div className="py-2">
                      {loadingRecipients ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : recipients.length === 0 ? (
                        <div className="p-4 text-center">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            No recipients found
                          </div>
                          <Button 
                            onClick={showCounterpartyConfirmation}
                            variant="outline"
                            size="sm"
                            className="mx-auto"
                            disabled={creatingCounterparty || !formData.recipientName || !formData.recipientPhone}
                          >
                            {creatingCounterparty && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create New Recipient
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="px-3 py-2 text-center">
                            <Button 
                              onClick={showCounterpartyConfirmation}
                              variant="outline"
                              size="sm"
                              className="mx-auto mb-2"
                              disabled={creatingCounterparty || !formData.recipientName || !formData.recipientPhone}
                            >
                              {creatingCounterparty && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Create New Recipient
                            </Button>
                          </div>
                          {recipients.map((recipient) => (
                            <div
                              key={recipient.Ref}
                              className={cn(
                                "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                formData.recipientRef === recipient.Ref && "bg-accent text-accent-foreground"
                              )}
                              onClick={() => handleSelectRecipient(recipient)}
                            >
                              {recipient.Description}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipientPhone">Recipient Phone *</Label>
            <Input
              id="recipientPhone"
              value={formData.recipientPhone}
              onChange={(e) => setFormData((prev) => ({ ...prev, recipientPhone: e.target.value }))}
            />
          </div>
        </div>
        
        {/* Display delivery post number if available */}
        {order.deliveryPostNumber && (
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium">Current Delivery Post Number:</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{order.deliveryPostNumber}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This order already has a delivery post number. Creating a new TTN will replace it.
            </p>
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="recipientContact">Recipient Contact Person {recipientContactPersons.length > 0 && "*"}</Label>
          <div className="relative" ref={recipientContactRef}>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              className="w-full justify-between"
              disabled={!formData.recipientRef}
              onClick={() => {
                setRecipientContactOpen(!recipientContactOpen);
                if (formData.recipientRef && !recipientContactPersons.length) {
                  fetchRecipientContactPersons(formData.recipientRef, recipientContactSearchValue);
                }
              }}
            >
              {formData.recipientContact || "Select contact person..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
            
            {recipientContactOpen && (
              <div className="absolute z-50 w-full bg-background border rounded-md shadow-md mt-1">
                <div className="flex items-center border-b px-3 py-2">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    placeholder="Search contact person..."
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={recipientContactSearchValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRecipientContactSearchValue(value);
                      if (formData.recipientRef) {
                        fetchRecipientContactPersons(formData.recipientRef, value);
                      }
                    }}
                    autoFocus
                  />
                </div>
                <ScrollArea className="max-h-[300px]">
                  <div className="py-2">
                    {loadingRecipientContacts ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : recipientContactPersons.length === 0 ? (
                      <div className="p-4 text-center">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          No contact persons found
                        </div>
                        <Button 
                          onClick={handleCreateContactPerson}
                          variant="outline"
                          size="sm"
                          className="mx-auto"
                          disabled={creatingContactPerson || !formData.recipientRef}
                        >
                          {creatingContactPerson && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Create New Contact Person
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="px-3 py-2 text-center">
                          <Button 
                            onClick={handleCreateContactPerson}
                            variant="outline"
                            size="sm"
                            className="mx-auto mb-2"
                            disabled={creatingContactPerson}
                          >
                            {creatingContactPerson && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create New Contact Person
                          </Button>
                        </div>
                        {recipientContactPersons.map((contact) => (
                          <div
                            key={contact.Ref}
                            className={cn(
                              "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                              formData.recipientContactRef === contact.Ref && "bg-accent text-accent-foreground"
                            )}
                            onClick={() => handleSelectRecipientContact(contact)}
                          >
                            {contact.Description}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
          {!formData.recipientRef && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Select a recipient first</p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="recipientCity">Recipient City *</Label>
            <div className="relative">
              <Input
                id="recipientCity"
                placeholder="Search city..."
                value={formData.recipientCity || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData((prev) => ({ ...prev, recipientCity: value }));
                  if (value.length >= 2) {
                    searchCities(value, 'recipient');
                    setRecipientCityOpen(true);
                  } else {
                    setRecipientCityOpen(false);
                  }
                }}
                className="w-full"
                autoComplete="off"
              />
              {searchingCities && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
              
              {recipientCityOpen && recipientCities.length > 0 && (
                <div className="absolute z-[100] w-full bg-background border rounded-md shadow-md mt-1 max-h-[300px] overflow-y-auto">
                  <div className="p-1">
                    {recipientCities.map((city) => (
                      <div
                        key={city.Ref}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground mb-1"
                        onClick={() => handleSelectCity(city, 'recipient')}
                      >
                        {city.Description} ({city.AreaDescription})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipientWarehouse">Recipient Warehouse *</Label>
            <div className="relative" ref={recipientWarehouseRef}>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className="w-full justify-between"
                disabled={!formData.recipientCityRef || recipientWarehouses.length === 0}
                onClick={() => setRecipientWarehouseOpen(!recipientWarehouseOpen)}
              >
                {formData.recipientWarehouse || "Select warehouse..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
              
              {recipientWarehouseOpen && (
                <div className="absolute z-50 w-full bg-background border rounded-md shadow-md mt-1">
                  <div className="flex items-center border-b px-3 py-2">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <Input
                      placeholder="Search warehouses..."
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      value={recipientWarehouseSearchValue}
                      onChange={(e) => setRecipientWarehouseSearchValue(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <ScrollArea className="max-h-[300px]">
                    <div className="py-2">
                      {recipientWarehouses
                        .filter(warehouse => 
                          warehouse.Description.toLowerCase().includes(recipientWarehouseSearchValue.toLowerCase()) || 
                          (warehouse.Number && warehouse.Number.toLowerCase().includes(recipientWarehouseSearchValue.toLowerCase()))
                        )
                        .map((warehouse) => (
                          <div
                            key={warehouse.Ref}
                            className={cn(
                              "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                              formData.recipientWarehouseRef === warehouse.Ref && "bg-accent text-accent-foreground"
                            )}
                            onClick={() => {
                              handleSelectWarehouse(warehouse, 'recipient');
                              setRecipientWarehouseOpen(false);
                            }}
                          >
                            {warehouse.Description}
                            {warehouse.Number && ` (№${warehouse.Number})`}
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
            {searchingWarehouses && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {!formData.recipientCityRef && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Select a city first</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderPackageStep = () => (
    <Card className="border-none shadow-none">
      <CardHeader className="px-4 pb-3">
        <CardTitle className="text-lg">Package Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg) *</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              value={formData.weight}
              onChange={(e) => setFormData((prev) => ({ ...prev, weight: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="length">Length (cm)</Label>
            <Input
              id="length"
              type="number"
              value={formData.length}
              onChange={(e) => setFormData((prev) => ({ ...prev, length: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="width">Width (cm)</Label>
            <Input
              id="width"
              type="number"
              value={formData.width}
              onChange={(e) => setFormData((prev) => ({ ...prev, width: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Height (cm)</Label>
            <Input
              id="height"
              type="number"
              value={formData.height}
              onChange={(e) => setFormData((prev) => ({ ...prev, height: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="seatsAmount">Number of Seats *</Label>
            <Input
              id="seatsAmount"
              type="number"
              min="1"
              value={formData.seatsAmount}
              onChange={(e) => setFormData((prev) => ({ ...prev, seatsAmount: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cargoType">Cargo Type *</Label>
            <Select
              value={formData.cargoType}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, cargoType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cargo type" />
              </SelectTrigger>
              <SelectContent>
                {CARGO_TYPES.map((cargo) => (
                  <SelectItem key={cargo.value} value={cargo.value}>
                    {cargo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost">Declared Value ($) *</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={formData.cost}
              onChange={(e) => setFormData((prev) => ({ ...prev, cost: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="serviceType">Service Type *</Label>
          <Select
            value={formData.serviceType}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, serviceType: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select service type" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TYPES.map((service) => (
                <SelectItem key={service.value} value={service.value}>
                  {service.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )

  const renderReviewStep = () => (
    <div className="space-y-4">
      <Card className="border-none shadow-none">
        <CardHeader className="px-4 pb-3">
          <CardTitle className="text-lg">Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentMethod: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map((payment) => (
                    <SelectItem key={payment.value} value={payment.value}>
                      {payment.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payerType">Payer Type *</Label>
              <Select
                value={formData.payerType}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, payerType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYER_TYPES.map((payer) => (
                    <SelectItem key={payer.value} value={payer.value}>
                      {payer.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Package description..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>
      <Card className="border-none shadow-none">
        <CardHeader className="px-4 pb-3">
          <CardTitle className="text-lg">Review Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm px-4">
          <ScrollArea className="h-[200px] pr-4">
            <div className="space-y-2">
              <p className="font-medium">Sender Information:</p>
              {formData.senderRef ? (
                <p>
                  <strong>Company:</strong> {formData.senderDescription || "Not selected"}
                </p>
              ) : (
                <p className="text-red-500">Sender not selected</p>
              )}
              {formData.senderCityRef && formData.senderCity ? (
                <p>
                  <strong>City:</strong> {formData.senderCity}
                </p>
              ) : (
                <p className="text-red-500">Sender city not selected</p>
              )}
              {formData.senderWarehouseRef && formData.senderWarehouse ? (
                <p>
                  <strong>Warehouse:</strong> {formData.senderWarehouse}
                </p>
              ) : (
                <p className="text-red-500">Sender warehouse not selected</p>
              )}
              {formData.senderContactRef && formData.senderContact ? (
                <p>
                  <strong>Contact Person:</strong> {formData.senderContact}
                </p>
              ) : (
                <p className="text-red-500">Sender contact person not selected</p>
              )}
              
              <div className="my-3 border-t" />
              
              <p className="font-medium">Recipient Information:</p>
              {formData.recipientName ? (
                <p>
                  <strong>Name:</strong> {formData.recipientDescription || formData.recipientName}
                </p>
              ) : (
                <p className="text-red-500">Recipient not specified</p>
              )}
              {formData.recipientPhone ? (
                <p>
                  <strong>Phone:</strong> {formData.recipientPhone}
                </p>
              ) : (
                <p className="text-red-500">Recipient phone not specified</p>
              )}
              {formData.recipientCityRef && formData.recipientCity ? (
                <p>
                  <strong>City:</strong> {formData.recipientCity}
                </p>
              ) : (
                <p className="text-red-500">Recipient city not selected</p>
              )}
              {formData.recipientWarehouseRef && formData.recipientWarehouse ? (
                <p>
                  <strong>Warehouse:</strong> {formData.recipientWarehouse}
                </p>
              ) : (
                <p className="text-red-500">Recipient warehouse not selected</p>
              )}
              {formData.recipientContactRef && formData.recipientContact ? (
                <p>
                  <strong>Contact Person:</strong> {formData.recipientContact}
                </p>
              ) : recipientContactPersons.length > 0 ? (
                <p className="text-red-500">Recipient contact person not selected</p>
              ) : null}
              
              <div className="my-3 border-t" />
              
              <p className="font-medium">Package Details:</p>
              <p>
                <strong>Weight:</strong> {formData.weight}kg
              </p>
              <p>
                <strong>Type:</strong> {formData.cargoType}
              </p>
              <p>
                <strong>Seats:</strong> {formData.seatsAmount}
              </p>
              <p>
                <strong>Value:</strong> ${formData.cost}
              </p>
              {formData.length && formData.width && formData.height && (
                <p>
                  <strong>Dimensions:</strong> {formData.length}×{formData.width}×{formData.height} cm
                </p>
              )}
              
              <div className="my-3 border-t" />
              
              <p className="font-medium">Delivery Details:</p>
              <p>
                <strong>Service Type:</strong> {SERVICE_TYPES.find(s => s.value === formData.serviceType)?.label}
              </p>
              <p>
                <strong>Payment:</strong> {PAYMENT_TYPES.find(p => p.value === formData.paymentMethod)?.label} by {PAYER_TYPES.find(p => p.value === formData.payerType)?.label}
              </p>
              {formData.description && (
                <p>
                  <strong>Description:</strong> {formData.description}
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          onOpenChange(isOpen)
          if (!isOpen) {
            // Reset to first step when dialog closes
            setTimeout(() => setCurrentStep("sender"), 300)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:w-[80vw] md:w-[70vw] lg:w-[60vw] xl:w-[50vw] p-6 text-gray-900 dark:text-gray-100" style={{ maxWidth: '800px', backgroundColor: 'var(--background)' }}>
          <DialogHeader>
            <DialogTitle>
              {existingTtn ? `Nova Poshta Invoice: ${existingTtn.number}` : "Generate Nova Poshta Invoice"}
            </DialogTitle>
          </DialogHeader>

          {/* If there's an existing TTN, show its information instead of the form */}
          {existingTtn ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">TTN Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">TTN Number:</p>
                      <p>{existingTtn.number}</p>
                    </div>
                    <div>
                      <p className="font-medium">Document Reference:</p>
                      <p className="text-xs text-muted-foreground">{existingTtn.documentRef}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowDeleteConfirmation(true)}
                      disabled={deletingTtn}
                    >
                      {deletingTtn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Delete Invoice
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>You can track this shipment on the <a href={`https://tracking.novaposhta.ua/#/${existingTtn.number}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">Nova Poshta website</a>.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Step Indicator - only show for new TTN creation */}
              <div className="flex items-center justify-center mb-4 gap-1 sm:gap-2 px-0">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium transition-colors duration-300 ${
                        index <= currentStepIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="ml-1 hidden sm:block">
                      <p
                        className={`text-xs font-medium transition-colors duration-300 ${
                          index <= currentStepIndex ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {step.title}
                      </p>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`w-4 h-0.5 mx-1 sm:mx-2 transition-colors duration-300 ${index < currentStepIndex ? "bg-primary" : "bg-muted"}`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div key={currentStep} className="min-h-[300px] animate-content-show">
                {currentStep === "sender" && renderSenderStep()}
                {currentStep === "recipient" && renderRecipientStep()}
                {currentStep === "package" && renderPackageStep()}
                {currentStep === "review" && renderReviewStep()}
              </div>
            </>
          )}

          <DialogFooter className="flex justify-end items-center pt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                setTimeout(() => setCurrentStep("sender"), 300)
              }}
              disabled={loading || deletingTtn}
            >
              {existingTtn ? "Close" : "Cancel"}
            </Button>
            
            {!existingTtn && (
              <>
                {currentStepIndex > 0 && (
                  <Button variant="outline" onClick={handlePrevious} disabled={loading || currentStepIndex === 0}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                )}
                {currentStep !== "review" ? (
                  <Button onClick={handleNext} disabled={loading}>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Invoice
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Creating Counterparty */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-md text-gray-900 dark:text-gray-100" style={{ backgroundColor: 'var(--background)' }}>
          <DialogHeader>
            <DialogTitle>Create New Recipient</DialogTitle>
            <DialogDescription>
              Create a new Nova Poshta recipient with the following details:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="font-medium">Name</div>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="editLastName">Last Name *</Label>
                  <Input
                    id="editLastName"
                    value={editableNames.lastName}
                    onChange={(e) => setEditableNames(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editFirstName">First Name *</Label>
                  <Input
                    id="editFirstName"
                    value={editableNames.firstName}
                    onChange={(e) => setEditableNames(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editMiddleName">Middle Name *</Label>
                  <Input
                    id="editMiddleName"
                    value={editableNames.middleName}
                    onChange={(e) => setEditableNames(prev => ({ ...prev, middleName: e.target.value }))}
                    placeholder="Enter middle name"
                  />
                </div>
              </div>
              
              {(!editableNames.lastName || !editableNames.firstName || !editableNames.middleName) && (
                <div className="text-red-500 text-xs">
                  {!editableNames.lastName ? "Last name is required. " : ""}
                  {!editableNames.firstName ? "First name is required. " : ""}
                  {!editableNames.middleName ? "Middle name is required. " : ""}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="font-medium">Phone</div>
              <div className="text-sm">{formData.recipientPhone}</div>
            </div>
            
            {order.customerEmail && (
              <div className="space-y-2">
                <div className="font-medium">Email</div>
                <div className="text-sm">{order.customerEmail}</div>
              </div>
            )}
          </div>
          
          <DialogFooter className="sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmation(false)}
              disabled={creatingCounterparty}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCounterparty}
              disabled={creatingCounterparty || !editableNames.lastName || !editableNames.firstName || !editableNames.middleName}
            >
              {creatingCounterparty && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Recipient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog for Deleting TTN */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Nova Poshta Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              TTN Number: <span className="font-medium text-foreground">{existingTtn?.number}</span>
            </p>
          </div>
          
          <DialogFooter className="sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirmation(false)}
              disabled={deletingTtn}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteTtn}
              disabled={deletingTtn}
            >
              {deletingTtn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
