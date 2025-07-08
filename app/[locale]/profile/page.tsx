import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import ProfilePageClient from './ProfilePageClient';

interface ProfilePageProps {
  params: { locale: string };
}

export default async function ProfilePage({ params: { locale } }: ProfilePageProps) {
  setRequestLocale(locale);
  
  const t = await getTranslations('Profile');

  return (
    <ProfilePageClient 
      translations={{
        title: t('title'),
        description: t('description'),
        profileDescription: t('profileDescription'),
        userManagementDescription: t('userManagementDescription'),
        myProfile: t('myProfile'),
        userRoles: t('userRoles'),
        name: t('name'),
        email: t('email'),
        role: t('role'),
        plan: t('plan'),
        editProfile: t('editProfile'),
        save: t('save'),
        cancel: t('cancel'),
        saving: t('saving'),
        nameLabel: t('nameLabel'),
        emailLabel: t('emailLabel'),
        nameRequired: t('nameRequired'),
        emailRequired: t('emailRequired'),
        emailInvalid: t('emailInvalid'),
        profileUpdateSuccess: t('profileUpdateSuccess'),
        profileUpdateError: t('profileUpdateError'),
        allUsers: t('allUsers'),
        userRole: t('userRole'),
        adminRole: t('adminRole'),
        cannotChangeAdminRole: t('cannotChangeAdminRole'),
        roleUpdateSuccess: t('roleUpdateSuccess'),
        roleUpdateError: t('roleUpdateError'),
        loadingUsers: t('loadingUsers'),
        noUsersFound: t('noUsersFound'),
        adminAccessRequired: t('adminAccessRequired'),
        actions: t('actions'),
      }}
    />
  );
}

export async function generateMetadata({ params: { locale } }: ProfilePageProps) {
  const t = await getTranslations({ locale, namespace: 'Profile' });
  
  return {
    title: t('title'),
    description: t('description'),
  };
}
