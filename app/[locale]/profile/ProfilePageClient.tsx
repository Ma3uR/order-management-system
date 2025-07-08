'use client';

import { useState } from 'react';
import { useProfile, useUsers } from '@/app/hooks';
import { useSession } from '@/app/hooks/useSession';
import { UsersRoleOptions } from '@/app/types/pocketbase-types';
import { isAdmin, PERMISSIONS } from '@/app/lib/auth/permissions';
import { toast } from 'sonner';
import { PermissionGate } from '@/app/components/auth/PermissionGate';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/shared/ui/card';
import { Avatar, AvatarFallback } from '@/app/components/shared/ui/avatar';
import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { Input } from '@/app/components/shared/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/shared/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/shared/ui/select';
import { Skeleton } from '@/app/components/shared/ui/skeleton';
import { PageHeader } from '@/app/components/shared/ui/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/shared/ui/table';
import { Separator } from '@/app/components/shared/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/app/components/shared/ui/form';
import { Edit, User, Users, Shield, Crown, Loader2 } from 'lucide-react';

// Validation schema for profile editing
const profileFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email format').max(200, 'Email is too long'),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

interface ProfilePageClientProps {
  translations: {
    title: string;
    description: string;
    profileDescription: string;
    userManagementDescription: string;
    myProfile: string;
    userRoles: string;
    name: string;
    email: string;
    role: string;
    plan: string;
    editProfile: string;
    save: string;
    cancel: string;
    saving: string;
    nameLabel: string;
    emailLabel: string;
    nameRequired: string;
    emailRequired: string;
    emailInvalid: string;
    profileUpdateSuccess: string;
    profileUpdateError: string;
    allUsers: string;
    userRole: string;
    adminRole: string;
    cannotChangeAdminRole: string;
    roleUpdateSuccess: string;
    roleUpdateError: string;
    loadingUsers: string;
    noUsersFound: string;
    adminAccessRequired: string;
    actions: string;
  };
}

export default function ProfilePageClient({ translations: t }: ProfilePageClientProps) {
  const { user: currentUser, isLoading: sessionLoading } = useSession();
  const { profile, isLoading: profileLoading, error: profileError, updateProfile } = useProfile();
  const { users, isLoading: usersLoading, error: usersError, setRole } = useUsers();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // React Hook Form setup with Zod validation
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  const { formState: { isDirty } } = form;

  // Get user's initials for avatar fallback
  const getUserInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name && typeof name === 'string' && name.trim()) {
      return name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email && typeof email === 'string' && email.trim()) {
      return email.trim().slice(0, 2).toUpperCase();
    }
    return 'U?'; // Fallback for unknown user
  };

  // Enhanced role badge styling with colors
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default'; // Blue background
      case 'user':
      default:
        return 'secondary'; // Gray background
    }
  };

  // Enhanced plan badge styling with colors
  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'default'; // Professional theme
      case 'free':
      default:
        return 'outline'; // Minimal theme
    }
  };

  // Profile card skeleton loader
  const ProfileSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start space-x-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Users table skeleton loader
  const UsersTableSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  // Start editing profile
  const handleStartEdit = () => {
    if (profile) {
      form.reset({
        name: profile.name,
        email: profile.email,
      });
      setIsEditing(true);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    form.reset();
  };

  // Save profile changes
  const handleSaveProfile = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      await updateProfile(data);
      toast.success(t.profileUpdateSuccess);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(t.profileUpdateError);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await setRole(userId, newRole as UsersRoleOptions);
      toast.success(t.roleUpdateSuccess);
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error(t.roleUpdateError);
    }
  };


  // Loading state
  if (sessionLoading || profileLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          heading={t.title}
          subheading={t.description}
        />
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t.myProfile}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t.userRoles}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="space-y-6">
            <ProfileSkeleton />
          </TabsContent>
          <TabsContent value="users" className="space-y-6">
            <UsersTableSkeleton />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Error state
  if (profileError) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              Error loading profile: {profileError.message}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No profile
  if (!profile) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-600">
              No profile data available
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showUserRolesTab = currentUser && isAdmin(currentUser.role as UsersRoleOptions);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        heading={t.title}
        subheading={t.description}
      />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className={`grid w-full ${showUserRolesTab ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t.myProfile}
          </TabsTrigger>
          {showUserRolesTab && (
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t.userRoles}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t.myProfile}
              </CardTitle>
              <CardDescription>
                {t.profileDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start space-x-4">
                {/* Avatar */}
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-lg">
                    {getUserInitials(profile.name, profile.email)}
                  </AvatarFallback>
                </Avatar>

                {/* Profile Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{profile.name}</h3>
                    <Badge variant={getRoleBadgeVariant(profile.role)}>
                      {profile.role === 'admin' ? (
                        <Shield className="h-3 w-3 mr-1" />
                      ) : (
                        <User className="h-3 w-3 mr-1" />
                      )}
                      {profile.role}
                    </Badge>
                    <Badge variant={getPlanBadgeVariant(profile.plan)}>
                      {profile.plan === 'pro' && <Crown className="h-3 w-3 mr-1" />}
                      {profile.plan}
                    </Badge>
                  </div>
                  <p className="text-gray-600">{profile.email}</p>
                  
                  {!isEditing && (
                    <Button onClick={handleStartEdit} variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      {t.editProfile}
                    </Button>
                  )}
                </div>
              </div>

              {/* Edit Form */}
              {isEditing && (
                <>
                  <Separator />
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSaveProfile)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t.nameLabel}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={t.nameRequired}
                                  disabled={isSaving}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t.emailLabel}</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder={t.emailRequired}
                                  disabled={isSaving}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          type="submit"
                          disabled={isSaving || !isDirty || !form.formState.isValid}
                          size="sm"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {t.saving}
                            </>
                          ) : (
                            t.save
                          )}
                        </Button>
                        <Button 
                          type="button"
                          onClick={handleCancelEdit} 
                          variant="outline" 
                          disabled={isSaving}
                          size="sm"
                        >
                          {t.cancel}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Roles Tab (Admin Only) */}
        <PermissionGate permission={PERMISSIONS.USERS_ROLE_MANAGE}>
          {showUserRolesTab && (
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t.userRoles}
                  </CardTitle>
                  <CardDescription>
                    {t.userManagementDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead>{t.role}</TableHead>
                            <TableHead>{t.plan}</TableHead>
                            <TableHead>{t.actions}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Skeleton className="h-8 w-8 rounded-full" />
                                  <Skeleton className="h-4 w-32" />
                                </div>
                              </TableCell>
                              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                              <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : usersError ? (
                    <div className="text-center py-8 text-red-600">
                      Error: {usersError.message}
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">
                      {t.noUsersFound}
                    </div>
                  ) : (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead>{t.role}</TableHead>
                            <TableHead>{t.plan}</TableHead>
                            <TableHead>{t.actions}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs">
                                      {getUserInitials(user.name, user.email)}
                                    </AvatarFallback>
                                  </Avatar>
                                  {user.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getRoleBadgeVariant(user.role)}>
                                  {user.role === 'admin' ? (
                                    <Shield className="h-3 w-3 mr-1" />
                                  ) : (
                                    <User className="h-3 w-3 mr-1" />
                                  )}
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getPlanBadgeVariant(user.plan)}>
                                  {user.plan === 'pro' && <Crown className="h-3 w-3 mr-1" />}
                                  {user.plan}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={user.role}
                                  onValueChange={(value) => handleRoleChange(user.id, value)}
                                  disabled={user.role === 'admin'}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">{t.userRole}</SelectItem>
                                    <SelectItem value="admin">{t.adminRole}</SelectItem>
                                  </SelectContent>
                                </Select>
                                {user.role === 'admin' && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {t.cannotChangeAdminRole}
                                  </p>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </PermissionGate>
      </Tabs>

      {!showUserRolesTab && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-600">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{t.adminAccessRequired}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
