"use client";
import SearchPage from '../../views/SearchPage';
import { Suspense } from 'react';

export default function Page() {
    return (
      <Suspense fallback={<div className="container" style={{ padding: '80px 0', textAlign: 'center' }}><div className="spinner"></div></div>}>
        <SearchPage />
      </Suspense>
    );
}
