'use client';

import { useState, useEffect } from 'react';
import pb from '@/app/lib/pocketbase';
import { getUserRole } from '@/app/lib/auth/user-roles';
import { UsersRoleOptions } from '@/app/types/pocketbase-types';

interface User {
  id: string;
  email: string;
  name?: string;
  username?: string;
  avatar?: string;
  role?: string;
}

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [authChangeCount, setAuthChangeCount] = useState(0);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoading(true);
        const changeNumber = Date.now();
        console.log(`🔍 [useSession #${changeNumber}] Starting loadUser...`);
        
        // Get the current authenticated user from PocketBase
        const authModel = pb.authStore.model;
        
        if (authModel) {
          console.log(`✅ [useSession #${changeNumber}] Auth model found:`, {
            id: authModel.id,
            email: authModel.email,
            name: authModel.name,
            collectionName: authModel.collectionName,
            type: authModel.type,
            rawRole: authModel.role
          });
          
          let finalRole: string | undefined;
          let roleSource = '';
          
          // Check if this is a PocketBase admin account vs regular user account
          const isPocketBaseAdmin = !authModel.collectionName || authModel.collectionName === 'admins' || authModel.type === 'admin';
          
          // Initialize this for all cases
          let isAdminByEmail = false;
          
          if (isPocketBaseAdmin) {
            console.log(`🔑 [useSession #${changeNumber}] DETECTED: PocketBase admin account - granting admin role`);
            finalRole = UsersRoleOptions.admin;
            roleSource = 'POCKETBASE_ADMIN';
          } else {
            // This is a regular user from the users collection
            console.log(`👤 [useSession #${changeNumber}] DETECTED: Regular user account from users collection`);
            
            // IMMEDIATE CHECK: Emergency fallback for known admin emails
            const adminEmails = [
              // 'andriimazurenko99@gmail.com', // Commented for testing
            ];
            isAdminByEmail = adminEmails.includes(authModel.email);
            
            if (isAdminByEmail) {
              console.log(`🎯 [useSession #${changeNumber}] IMMEDIATE ADMIN DETECTION: Email matches admin list, setting admin role`);
              finalRole = UsersRoleOptions.admin;
              roleSource = 'EMAIL_OVERRIDE';
            } else {
              // Method 1: Check if role exists directly in authModel
              if (authModel.role) {
                console.log(`🎯 [useSession #${changeNumber}] Found role directly in authModel:`, authModel.role);
                finalRole = authModel.role;
                roleSource = 'AUTH_MODEL_DIRECT';
              } else {
                console.log(`❌ [useSession #${changeNumber}] No role in authModel, trying getUserRole function...`);
                
                try {
                  const fetchedRole = await getUserRole(authModel.id);
                  console.log(`✅ [useSession #${changeNumber}] getUserRole returned:`, fetchedRole);
                  
                  if (fetchedRole) {
                    finalRole = fetchedRole;
                    roleSource = 'GET_USER_ROLE_FUNCTION';
                  } else {
                    console.log(`⚠️ [useSession #${changeNumber}] getUserRole returned null, applying default role`);
                    finalRole = UsersRoleOptions.user;
                    roleSource = 'DEFAULT_USER';
                  }
                } catch (roleError) {
                  console.error(`❌ [useSession #${changeNumber}] getUserRole failed:`, roleError);
                  console.log(`🚨 [useSession #${changeNumber}] FALLBACK: Setting default user role due to error`);
                  finalRole = UsersRoleOptions.user;
                  roleSource = 'ERROR_FALLBACK';
                }
              }
            }
          }
          
          const userObject = {
            id: authModel.id,
            email: authModel.email,
            name: authModel.name,
            username: authModel.username,
            avatar: authModel.avatar,
            role: finalRole,
          };
          
          console.log(`✅ [useSession #${changeNumber}] Setting user object:`, userObject);
          setUser(userObject);
          
          console.log(`🔍 [useSession #${changeNumber}] Final state:`, {
            roleValue: finalRole,
            roleType: typeof finalRole,
            roleSource: roleSource,
            isAdminByEmail: isAdminByEmail,
            timestamp: new Date().toISOString()
          });
          
        } else {
          console.log(`❌ [useSession #${changeNumber}] No auth model found`);
          setUser(null);
        }
      } catch (error) {
        console.error(`❌ [useSession] Error loading user:`, error);
        setError(error instanceof Error ? error : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    // Load user initially
    loadUser();
      
    // Subscribe to authentication changes
    const unsubscribe = pb.authStore.onChange((token, model) => {
      const changeCount = authChangeCount + 1;
      setAuthChangeCount(changeCount);
      
      console.log(`🔄 [useSession onChange #${changeCount}] Auth store changed:`, {
        hasToken: !!token,
        hasModel: !!model,
        modelId: model?.id,
        modelEmail: model?.email,
        modelType: model?.collectionName || model?.type || 'unknown',
        isValid: pb.authStore.isValid,
        timestamp: new Date().toISOString(),
        stackTrace: new Error().stack
      });
      
      loadUser(); // Reload user data when auth changes
    });
      
    return () => {
      unsubscribe();
    };
  }, [authChangeCount]);

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
}