'use client';

import { useState, useEffect, useCallback } from 'react';
import { getProfile, updateProfile as updateProfileAction, ProfileUpdateData, Profile } from '@/app/[locale]/profile/actions/profile';

export { type Profile, type ProfileUpdateData };

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await getProfile();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.data) {
        setProfile(result.data);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update profile with optimistic updates
  const updateProfile = useCallback(async (updateData: ProfileUpdateData) => {
    if (!profile) {
      throw new Error('No profile loaded');
    }

    // Store original profile for rollback
    const originalProfile = profile;
    
    try {
      // Optimistic update - immediately update the UI
      const optimisticProfile = {
        ...profile,
        ...updateData,
        updated: new Date().toISOString(),
      };
      setProfile(optimisticProfile);

      // Call server action
      const result = await updateProfileAction(updateData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Update with actual server response
      if (result.data) {
        setProfile(result.data);
        return result.data;
      }
    } catch (err) {
      // Rollback optimistic update on error
      setProfile(originalProfile);
      const error = err instanceof Error ? err : new Error('Unknown error');
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [profile]);

  // Refresh profile data
  const refreshProfile = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Load profile on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    refreshProfile,
  };
}
