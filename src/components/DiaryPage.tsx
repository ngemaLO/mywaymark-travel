import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface DiaryPageProps {
  children: React.ReactNode;
  className?: string;
}

export function DiaryPage({ children, className = '' }: DiaryPageProps) {
  const location = useLocation();
  const [fadeKey, setFadeKey] = useState(location.pathname);

  useEffect(() => {
    setFadeKey(location.pathname);
  }, [location.pathname]);

  return (
    <div className="diary-book">
      {/* Book spine shadow on left */}
      <div className="diary-spine" aria-hidden="true" />
      
      {/* Page content — re-keys on route change to trigger fade-in */}
      <div
        key={fadeKey}
        className={`diary-page-inner diary-flip-in ${className}`}
      >
        {children}
      </div>

      {/* Subtle page edge on right */}
      <div className="diary-edge" aria-hidden="true" />
      
      {/* Corner curls */}
      <div className="diary-corner diary-corner--top-right" aria-hidden="true" />
      <div className="diary-corner diary-corner--bottom-right" aria-hidden="true" />
    </div>
  );
}
