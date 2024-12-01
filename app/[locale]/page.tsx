import { setRequestLocale } from 'next-intl/server';

export default function Page({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  
  return (
    <div>
      {/* Your page content here */}
    </div>
  );
} 