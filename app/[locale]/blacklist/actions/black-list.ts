"use server";

import pb from "../../../lib/pocketbase";
import { validatePocketbaseResponse } from "../../../lib/api-utils";
import { authenticatedCall } from "../../../lib/pocketbase";
import { BlacklistFormData } from "../../../lib/validations/blacklist";
import { blacklistEntrySchema } from "../../../lib/validations/blacklist";
import { BlacklistEntriesResponse } from "../../../types/pocketbase-types";

export const createBlackList = async (data: BlacklistFormData)=>{
    try {
        blacklistEntrySchema.parse(data);
        const blackList = await authenticatedCall(() => pb.collection('blacklist_entries').create<BlacklistEntriesResponse>(data));
        const validatedBlackList = validatePocketbaseResponse(blackList, blacklistEntrySchema);
        return { error: undefined, data: validatedBlackList };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in createBlackList', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in createBlackList', error);
        return { error: 'Unknown error in createBlackList', data: undefined };
    }
}

export const updateBlackList = async (id: string, data: BlacklistFormData)=>{
    try {
        blacklistEntrySchema.parse(data);
        const blackList = await authenticatedCall(() => pb.collection('blacklist_entries').update<BlacklistEntriesResponse>(id, data));
        const validatedBlackList = validatePocketbaseResponse(blackList, blacklistEntrySchema);
        return { error: undefined, data: validatedBlackList };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in updateBlackList', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in updateBlackList', error);
        return { error: 'Unknown error in updateBlackList', data: undefined };
    }
}

export const deleteBlackList = async (id: string)=>{
    try {
        const deletionStatus = await authenticatedCall(() => pb.collection('blacklist_entries').delete(id));
        return { error: undefined, data: deletionStatus };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in deleteBlackList', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in deleteBlackList', error);
        return { error: 'Unknown error in deleteBlackList', data: undefined };
    }
}

export const getBlackList = async (id: string)=>{
    try {
        const blackList = await authenticatedCall(() => pb.collection('blacklist_entries').getOne<BlacklistEntriesResponse>(id));
        const validatedBlackList = validatePocketbaseResponse(blackList, blacklistEntrySchema);
        return { error: undefined, data: validatedBlackList };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in getBlackList', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in getBlackList', error);
        return { error: 'Unknown error in getBlackList', data: undefined };
    }
}   

export const checkBlackList = async (data: BlacklistFormData)=>{
    try {
        // Normalize and escape the inputs
        const normalizedPhone = (data.phoneNumber || '').replace(/[^\d+]/g, '');
        const escapedFullName = data.fullName?.replace(/"/g, '\\"') || '';
        
        // Handle Ukrainian phone number normalization
        const phoneSearchPatterns = [];
        if (normalizedPhone) {
            phoneSearchPatterns.push(normalizedPhone);
            
            // If phone doesn't start with +380 or 380, and looks like Ukrainian number (starts with 0 and is 10 digits)
            if (!normalizedPhone.startsWith('+380') && !normalizedPhone.startsWith('380') && 
                normalizedPhone.startsWith('0') && normalizedPhone.length === 10) {
                // Add 380 prefix (remove leading 0 and add 380)
                const phoneWith380 = '380' + normalizedPhone.substring(1);
                phoneSearchPatterns.push(phoneWith380);
                phoneSearchPatterns.push('+' + phoneWith380);
            }
            
            // Also try without leading + if it exists
            if (normalizedPhone.startsWith('+')) {
                phoneSearchPatterns.push(normalizedPhone.substring(1));
            }
        }
        
        let filter = '';
        if (phoneSearchPatterns.length > 0 && escapedFullName) {
            const phoneFilters = phoneSearchPatterns.map(phone => `phoneNumber = "${phone}"`).join(' || ');
            filter = `(${phoneFilters}) || fullName ~ "${escapedFullName}"`;
        } else if (phoneSearchPatterns.length > 0) {
            filter = phoneSearchPatterns.map(phone => `phoneNumber = "${phone}"`).join(' || ');
        } else if (escapedFullName) {
            filter = `fullName ~ "${escapedFullName}"`;
        }

        if (!filter) {
            return { error: undefined, data: { isBlacklisted: false, record: null } };
        }

        // Get the records
        const records = await authenticatedCall(() => pb.collection('blacklist_entries').getFullList<BlacklistEntriesResponse>({
            filter: filter,
        }));

        return { 
            error: undefined, 
            data: {
                isBlacklisted: records.length > 0,
                record: records[0] || null
            }
        };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error in checkBlackList', error);
            return { error: error.message, data: undefined };
        }
        console.error('Error in checkBlackList', error);
        return { error: 'Unknown error in checkBlackList', data: undefined };
    }
}

export const getBlackListPaginated = async (page: number, perPage: number, search?: string) => {
  try {
    const filter = search ? `fullName ~ "${search}" || phoneNumber ~ "${search}" || city ~ "${search}"` : '';
    
    const resultList = await authenticatedCall(() => 
      pb.collection('blacklist_entries').getList<BlacklistEntriesResponse>(
        page,
        perPage,
        {
          filter,
          sort: '-created'
        }
      )
    );

    return {
      error: undefined,
      data: {
        items: resultList.items,
        page: resultList.page,
        perPage: resultList.perPage,
        totalItems: resultList.totalItems,
        totalPages: resultList.totalPages
      }
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error in getBlackListPaginated', error);
      return { error: error.message, data: undefined };
    }
    console.error('Error in getBlackListPaginated', error);
    return { error: 'Unknown error in getBlackListPaginated', data: undefined };
  }
};