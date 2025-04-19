import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { auth } from '@/app/lib/auth'
import { headers } from 'next/headers'

export default async function Home() {
  const session = await getServerSession(auth)
  
  // Get the accept-language header to determine default locale
  const headersList = headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  
  // Check for Ukrainian language preference using more accurate detection
  const isUkrainian = acceptLanguage.includes('uk-UA') || 
                      acceptLanguage.includes('uk') ||
                      acceptLanguage.startsWith('uk')
  
  // Default to 'ua' if Ukrainian is preferred, otherwise use 'en'
  const preferredLocale = isUkrainian ? 'ua' : 'en'
  
  // Redirect based on authentication status
  if (session) {
    redirect(`/${preferredLocale}/dashboard`)
  } else {
    redirect(`/${preferredLocale}/login`)
  }
} 