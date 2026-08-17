/**
 * DemoModeBanner — Shows when app is running without Firebase configuration
 * Informs users they are viewing demo data, not live data.
 */
import React from 'react';
import { FlaskConical } from 'lucide-react';

interface DemoModeBannerProps {
  message?: string;
}

const DemoModeBanner: React.FC<DemoModeBannerProps> = ({
  message = 'Firebase not configured — displaying demo data. Add your .env credentials to connect live data.'
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center gap-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300"
    >
      <FlaskConical size={16} className="flex-shrink-0" aria-hidden="true" />
      <span className="font-semibold">DEMO DATA</span>
      <span className="flex-1">{message}</span>
    </div>
  );
};

export default DemoModeBanner;
