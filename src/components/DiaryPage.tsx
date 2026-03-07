import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface DiaryPageProps {
  children: React.ReactNode;
  className?: string;
}

export function DiaryPage({ children, className = '' }: DiaryPageProps) {
  const location = useLocation();
  const [animating, setAnimating] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      setAnimating(true);
      // Brief flip-out, then swap content and flip-in
      const timer = setTimeout(() => {
        setDisplayChildren(children);
        setAnimating(false);
        prevPathRef.current = location.pathname;
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setDisplayChildren(children);
    }
  }, [location.pathname, children]);

  return (
    <div className="diary-book">
      {/* Book spine shadow on left */}
      <div className="diary-spine" aria-hidden="true" />
      
      {/* Page content with flip animation */}
      <div
        className={`diary-page-inner ${animating ? 'diary-flip-out' : 'diary-flip-in'} ${className}`}
      >
        {displayChildren}
      </div>

      {/* Subtle page edge on right */}
      <div className="diary-edge" aria-hidden="true" />
      
      {/* Corner curls */}
      <div className="diary-corner diary-corner--top-right" aria-hidden="true" />
      <div className="diary-corner diary-corner--bottom-right" aria-hidden="true" />
    </div>
  );
}
