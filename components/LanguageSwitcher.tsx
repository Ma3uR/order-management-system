'use client';

import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';

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
