import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Clock, BookOpen, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { AddTripModal } from '@/components/AddTripModal';

const tabs = [
  { label: 'Map', path: '/', icon: MapPin },
  { label: 'Timeline', path: '/timeline', icon: Clock },
  { label: 'Add', path: null, icon: Plus, isAction: true },
  { label: 'Letters', path: '/letters', icon: BookOpen },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [addTripOpen, setAddTripOpen] = useState(false);

  return (
    <>
      <nav className="bottom-nav">
        {tabs.map((tab) => {
          const isActive = tab.path ? location.pathname === tab.path : false;

          if (tab.isAction) {
            return (
              <button
                key="add"
                className="bottom-nav-add"
                onClick={() => setAddTripOpen(true)}
                aria-label="Add entry"
              >
                <Plus className="w-5 h-5" />
              </button>
            );
          }

          return (
            <button
              key={tab.path}
              className={cn('bottom-nav-item', isActive && 'bottom-nav-item--active')}
              onClick={() => tab.path && navigate(tab.path)}
            >
              <tab.icon className="w-5 h-5" />
              <span className="bottom-nav-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>
      <AddTripModal open={addTripOpen} onOpenChange={setAddTripOpen} />
    </>
  );
}
