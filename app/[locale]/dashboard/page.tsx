import { useTranslations } from 'next-intl';

export default function Dashboard() {
  const t = useTranslations('Dashboard');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
      <p>{t('welcome')}</p>
    </div>
  );
}
