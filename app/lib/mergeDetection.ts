import { OrdersResponse, StatusResponse } from "@/app/types/pocketbase-types";

/**
 * Configuration for merge detection algorithm
 */
export interface MergeDetectionConfig {
  /** Time window in hours to consider orders for potential merging */
  timeWindowHours: number;
  /** Minimum similarity score for name matching (0-1) */
  nameMatchThreshold: number;
  /** Enable phone number exact matching */
  enablePhoneMatching: boolean;
  /** Enable name similarity matching */
  enableNameMatching: boolean;
}

/**
 * Default configuration for merge detection
 * Since we're only looking at this week's orders, we can use a larger time window
 */
export const DEFAULT_MERGE_CONFIG: MergeDetectionConfig = {
  timeWindowHours: 168, // 7 days (full week)
  nameMatchThreshold: 0.7,
  enablePhoneMatching: true,
  enableNameMatching: true,
};

/**
 * Represents a detected potential merge between orders
 */
export interface PotentialMerge {
  orders: OrdersResponse[];
  matchType: 'phone' | 'name' | 'both';
  confidence: number;
  matchedFields: string[];
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const normalizedStr1 = str1.toLowerCase().trim();
  const normalizedStr2 = str2.toLowerCase().trim();
  
  if (normalizedStr1 === normalizedStr2) return 1;
  
  const maxLength = Math.max(normalizedStr1.length, normalizedStr2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(normalizedStr1, normalizedStr2);
  return (maxLength - distance) / maxLength;
}

/**
 * Normalize phone number by removing common formatting characters
 */
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[\s\-\(\)\+]/g, '');
}

/**
 * Check if two phone numbers match after normalization
 */
function phoneNumbersMatch(phone1: string, phone2: string): boolean {
  if (!phone1 || !phone2) return false;
  
  const normalized1 = normalizePhoneNumber(phone1);
  const normalized2 = normalizePhoneNumber(phone2);
  
  // Exact match
  if (normalized1 === normalized2) return true;
  
  // Match if one contains the other (for international vs local format)
  if (normalized1.length >= 7 && normalized2.length >= 7) {
    return normalized1.includes(normalized2) || normalized2.includes(normalized1);
  }
  
  return false;
}

/**
 * Check if two orders were created within the specified time window
 */
function ordersWithinTimeWindow(
  order1: OrdersResponse, 
  order2: OrdersResponse, 
  timeWindowHours: number
): boolean {
  const date1 = new Date(order1.created_at_marketplace || order1.created);
  const date2 = new Date(order2.created_at_marketplace || order2.created);
  
  const timeDiffMs = Math.abs(date1.getTime() - date2.getTime());
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
  
  return timeDiffHours <= timeWindowHours;
}

/**
 * Check if an order was created this week (Monday to Sunday)
 */
function isOrderFromThisWeek(order: OrdersResponse): boolean {
  const orderDate = new Date(order.created_at_marketplace || order.created);
  const now = new Date();
  
  // Get start of current week (Monday)
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  
  // Get end of current week (Sunday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  const isThisWeek = orderDate >= startOfWeek && orderDate <= endOfWeek;
  
  if (isThisWeek) {
    console.log(`📅 [MergeDetection] Order ${order.orderNumber} is from this week (${orderDate.toLocaleDateString()})`);
  }
  
  return isThisWeek;
}

/**
 * Check if an order has "being processed by manager" status
 * This function checks for common variations of this status name
 */
function isBeingProcessedByManager(order: OrdersResponse, statuses: StatusResponse[]): boolean {
  // Find the status object for this order
  const orderStatus = statuses.find(status => status.id === order.status);
  
  if (!orderStatus) {
    console.log(`⚠️ [MergeDetection] Status not found for order ${order.orderNumber} with status ID: ${order.status}`);
    return false;
  }
  
  const statusName = orderStatus.name.toLowerCase();
  
  // Check for various forms of "being processed by manager" status
  const isProcessingStatus = (
    statusName.includes('обробляється менеджером') || // Ukrainian
    statusName.includes('being processed by manager') || // English
    statusName.includes('обробляється') || // Ukrainian short form
    statusName.includes('processing') || // English short form
    statusName === 'being_processed' || // Programmatic name
    statusName === 'обробка' // Ukrainian short
  );
  
  if (isProcessingStatus) {
    console.log(`✅ [MergeDetection] Order ${order.orderNumber} has processing status: "${orderStatus.name}"`);
  }
  
  return isProcessingStatus;
}

/**
 * Detect potential merges between orders based on various criteria
 */
export function detectPotentialMerges(
  orders: OrdersResponse[],
  statuses: StatusResponse[] = [],
  config: MergeDetectionConfig = DEFAULT_MERGE_CONFIG
): PotentialMerge[] {
  const potentialMerges: PotentialMerge[] = [];
  const processedPairs = new Set<string>();
  
  // Filter orders to only include:
  // 1. Non-archived and non-merged orders
  // 2. Orders from this week only
  // 3. Orders with "being processed by manager" status
  const eligibleOrders = orders.filter(order => {
    const isActive = !order.archived && order.mergeStatus !== 'merged';
    const isThisWeek = isOrderFromThisWeek(order);
    const isBeingProcessed = isBeingProcessedByManager(order, statuses);
    
    return isActive && isThisWeek && isBeingProcessed;
  });
  
  console.log(`🔍 [MergeDetection] Filtered ${orders.length} orders to ${eligibleOrders.length} eligible orders (this week + being processed by manager)`);
  
  for (let i = 0; i < eligibleOrders.length; i++) {
    for (let j = i + 1; j < eligibleOrders.length; j++) {
      const order1 = eligibleOrders[i];
      const order2 = eligibleOrders[j];
      
      // Create unique pair identifier to avoid duplicates
      const pairId = [order1.id, order2.id].sort().join('-');
      if (processedPairs.has(pairId)) continue;
      processedPairs.add(pairId);
      
      // Skip if orders are not within time window
      if (!ordersWithinTimeWindow(order1, order2, config.timeWindowHours)) {
        continue;
      }
      
      const matchedFields: string[] = [];
      let matchType: 'phone' | 'name' | 'both' | null = null;
      let confidence = 0;
      
      // Check phone number matching
      let phoneMatch = false;
      if (config.enablePhoneMatching && phoneNumbersMatch(order1.phoneNumber, order2.phoneNumber)) {
        phoneMatch = true;
        matchedFields.push('phoneNumber');
        confidence += 0.6; // High confidence for phone match
        matchType = 'phone';
      }
      
      // Check name similarity
      let nameMatch = false;
      if (config.enableNameMatching) {
        const nameSimilarity = calculateSimilarity(order1.fullName, order2.fullName);
        if (nameSimilarity >= config.nameMatchThreshold) {
          nameMatch = true;
          matchedFields.push('fullName');
          confidence += nameSimilarity * 0.4; // Weighted by similarity score
          matchType = matchType === 'phone' ? 'both' : 'name';
        }
      }
      
      // Additional matching criteria can be added here
      // e.g., delivery address similarity, product similarity, etc.
      
      // If we have a match, create a potential merge
      if (phoneMatch || nameMatch) {
        // Ensure confidence doesn't exceed 1.0
        confidence = Math.min(confidence, 1.0);
        
        potentialMerges.push({
          orders: [order1, order2],
          matchType: matchType as 'phone' | 'name' | 'both',
          confidence,
          matchedFields,
        });
        
        console.log(`📋 [MergeDetection] Found potential merge: ${order1.orderNumber} + ${order2.orderNumber} (${matchType}, confidence: ${confidence.toFixed(2)})`);
      }
    }
  }
  
  // Sort by confidence (highest first)
  potentialMerges.sort((a, b) => b.confidence - a.confidence);
  
  console.log(`✅ [MergeDetection] Found ${potentialMerges.length} potential merges`);
  
  return potentialMerges;
}

/**
 * Group orders that might be duplicates based on potential merges
 */
export function groupPotentialDuplicates(
  orders: OrdersResponse[],
  statuses: StatusResponse[] = [],
  config: MergeDetectionConfig = DEFAULT_MERGE_CONFIG
): OrdersResponse[][] {
  const potentialMerges = detectPotentialMerges(orders, statuses, config);
  const groups: OrdersResponse[][] = [];
  const processedOrderIds = new Set<string>();
  
  for (const merge of potentialMerges) {
    // Skip if any order in this merge is already processed
    if (merge.orders.some(order => processedOrderIds.has(order.id))) {
      continue;
    }
    
    // Add all orders in this merge to the processed set
    merge.orders.forEach(order => processedOrderIds.add(order.id));
    
    // Add this group to the result
    groups.push(merge.orders);
  }
  
  return groups;
}

/**
 * Get detailed information about why orders were considered for merging
 */
export function getMergeDetails(merge: PotentialMerge): string {
  const details: string[] = [];
  
  if (merge.matchedFields.includes('phoneNumber')) {
    details.push('Same phone number');
  }
  
  if (merge.matchedFields.includes('fullName')) {
    details.push('Similar customer name');
  }
  
  const timeDiff = Math.abs(
    new Date(merge.orders[0].created_at_marketplace || merge.orders[0].created).getTime() -
    new Date(merge.orders[1].created_at_marketplace || merge.orders[1].created).getTime()
  ) / (1000 * 60 * 60);
  
  details.push(`Created ${timeDiff.toFixed(1)} hours apart`);
  
  return details.join(', ');
}