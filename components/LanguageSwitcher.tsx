'use client';

import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';

/**
 * LanguageSwitcher component for toggling between English and Ukrainian languages.
 * This component renders a button that, when clicked, switches the application's
 * language by modifying the URL path.
 *
 * @returns {JSX.Element} A button element that allows language switching.
 */
export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  const switchLanguage = () => {
    const newLocale = pathname.startsWith('/ua') ? '' : '/ua';
    const newPath = newLocale + (pathname.startsWith('/ua') ? pathname.slice(3) : pathname);
    router.push(newPath);
  };

  return (
    <button onClick={switchLanguage} className="px-4 py-2 bg-blue-500 text-white rounded">
      {pathname.startsWith('/ua') ? 'English' : 'Українська'}
    </button>
  );
}
