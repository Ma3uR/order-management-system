'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function LanguageSwitcher() {
  const router = useRouter();
  const locale = useLocale();

  const switchLanguage = () => {
    const newLocale = locale === 'en' ? 'uk' : 'en';
    router.push(`/${newLocale}`);
  };

  return (
    <button onClick={switchLanguage} className="px-4 py-2 bg-blue-500 text-white rounded">
      {locale === 'en' ? 'Українська' : 'English'}
    </button>
  );
}
