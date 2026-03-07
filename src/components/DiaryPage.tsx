import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface DiaryPageProps {
  children: React.ReactNode;
  className?: string;
}

export function DiaryPage({ children, className = '' }: DiaryPageProps) {
  const location = useLocation();
  const [layers, setLayers] = useState<{ key: string; content: React.ReactNode }[]>([
    { key: location.pathname, content: children },
  ]);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      // Add the new page on top while old page fades out underneath
      setLayers((prev) => [
        { key: prevPathRef.current, content: prev[prev.length - 1].content },
        { key: location.pathname, content: children },
      ]);
      prevPathRef.current = location.pathname;

      // Remove old layer after animation completes
      const timer = setTimeout(() => {
        setLayers((prev) => [prev[prev.length - 1]]);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Same route, just update content
      setLayers([{ key: location.pathname, content: children }]);
    }
  }, [location.pathname, children]);

  return (
    <div className="diary-book">
      <div className="diary-spine" aria-hidden="true" />

      <div className="diary-layers">
        {layers.map((layer, i) => {
          const isOld = layers.length > 1 && i === 0;
          const isNew = layers.length > 1 && i === layers.length - 1;
          return (
            <div
              key={layer.key + '-' + i}
              className={`diary-page-inner ${isOld ? 'diary-fade-out' : ''} ${isNew ? 'diary-fade-in' : ''} ${className}`}
              style={isOld ? { position: 'absolute', inset: 0, zIndex: 1 } : { position: 'relative', zIndex: 2 }}
            >
              {layer.content}
            </div>
          );
        })}
      </div>

      <div className="diary-edge" aria-hidden="true" />
      <div className="diary-corner diary-corner--top-right" aria-hidden="true" />
      <div className="diary-corner diary-corner--bottom-right" aria-hidden="true" />
    </div>
  );
}
