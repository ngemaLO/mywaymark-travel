import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTravelState, useEndCurrentTrip } from '@/hooks/useCurrentTrip';
import { getCountryByIso } from '@/data/countries';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Users, Loader2 } from 'lucide-react';
import { MeetInPersonModal } from './connections/MeetInPersonModal';

interface TodayEntryProps {
  onAddTrip: () => void;
}

export function TodayEntry({ onAddTrip }: TodayEntryProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: travelState, isLoading } = useTravelState();
  const endTripMutation = useEndCurrentTrip();
  const [meetModalOpen, setMeetModalOpen] = useState(false);

  if (!user || isLoading) {
    return null;
  }

  const today = new Date();
  const dateStr = format(today, 'EEEE, MMMM d');

  // "At Home" state
  if (!travelState || travelState.type === 'none' || travelState.type === 'at_home') {
    const country = travelState?.homeBaseCountry 
      ? getCountryByIso(travelState.homeBaseCountry)
      : null;

    return (
      <article className="journal-entry">
        <p className="journal-date">{dateStr}</p>
        <h1 className="journal-title">
          {country ? `Home in ${country.name}` : 'Home'}
        </h1>
        <p className="journal-body journal-body--muted">
          Where will you go next?
        </p>
        <nav className="journal-actions">
          <button onClick={onAddTrip} className="journal-link">
            Add an entry
          </button>
          <span className="journal-separator">or</span>
          <button onClick={() => navigate('/timeline')} className="journal-link journal-link--secondary">
            browse your timeline
          </button>
        </nav>
      </article>
    );
  }

  // "Travelling" state
  const currentTrip = travelState.currentTrip!;
  const country = getCountryByIso(currentTrip.country_iso2);
  if (!country) return null;

  const arrivalDate = new Date(currentTrip.arrival_date);
  const daysAway = Math.floor((today.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysText = daysAway === 0 ? 'Arrived today' : 
                   daysAway === 1 ? '1 day' : 
                   `${daysAway} days`;

  return (
    <article className="journal-entry">
      <p className="journal-date">{dateStr}</p>
      <h1 className="journal-title journal-title--location">
        {country.name}
      </h1>
      <p className="journal-body">
        {daysAway === 0 ? (
          <>You arrived today.</>
        ) : (
          <>
            You've been here {daysText}, since {format(arrivalDate, 'MMMM d')}.
          </>
        )}
      </p>
      
      <nav className="journal-actions">
        <button 
          onClick={() => navigate(`/country/${currentTrip.country_iso2}`)} 
          className="journal-link"
        >
          Continue this entry
        </button>
        <span className="journal-separator">·</span>
        <button 
          onClick={() => setMeetModalOpen(true)}
          className="journal-link journal-link--secondary"
        >
          <Users className="w-3.5 h-3.5" />
          Meet someone
        </button>
        <span className="journal-separator">·</span>
        <button 
          onClick={() => endTripMutation.mutate(currentTrip.id)}
          disabled={endTripMutation.isPending}
          className="journal-link journal-link--tertiary"
        >
          {endTripMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            'Mark as ended'
          )}
        </button>
      </nav>

      <MeetInPersonModal
        open={meetModalOpen}
        onOpenChange={setMeetModalOpen}
        tripId={currentTrip.trip_id || currentTrip.id}
      />
    </article>
  );
}
