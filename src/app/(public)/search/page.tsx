import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SearchClient } from './search-client';

export const metadata: Metadata = {
  title: 'Search',
};

export default function SearchPage() {
  return (
    <>
      <Breadcrumbs items={[
        { label: 'Home', href: '/front' },
        { label: 'Search' },
      ]} />
      <Suspense>
        <SearchClient />
      </Suspense>
    </>
  );
}
