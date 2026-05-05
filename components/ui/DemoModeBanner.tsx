/**
 * DemoModeBanner — Shows when app is running without Firebase configuration
 * Informs users they are viewing demo data, not live data.
 */
import React, { useState } from 'react';
import { FlaskConical, X } from 'lucide-react';

interface DemoModeBannerProps {
  message?: string;
}

const DemoModeBanner: React.FC<DemoModeBannerProps> = ({
  message = 'Firebase not configured — displaying demo data. Add your .env credentials to connect live data.'
}) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
      <FlaskConical size={16} className="flex-shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss demo mode banner"
        className="p-1 hover:bg-amber-100 dark:hover:bg-amber-800/50 rounded transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default DemoModeBanner;
