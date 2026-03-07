import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTravelState, useEndCurrentTrip } from '@/hooks/useCurrentTrip';
import { useGenerateLetter } from '@/hooks/useLetters';
import { getCountryByIso } from '@/data/countries';
import { format, differenceInDays, isToday } from 'date-fns';
import { MeetInPersonModal } from './connections/MeetInPersonModal';
import { EndEntryModal } from './EndEntryModal';
import { EditVisitModal } from './EditVisitModal';

interface TodayEntryProps {
  onAddTrip: () => void;
}

// Generate present-tense, live copy for ongoing entries
function getOngoingCopy(arrivalDate: string): string {
  const arrival = new Date(arrivalDate);
  const today = new Date();
  const days = differenceInDays(today, arrival);
  
  if (isToday(arrival)) {
    return 'You arrived today.';
  }
  if (days === 1) {
    return 'You arrived yesterday.';
  }
  if (days <= 7) {
    return `You've been here ${days} days.`;
  }
  if (days <= 14) {
    return `You've been here over a week.`;
  }
  if (days <= 30) {
    return `You've been here ${Math.floor(days / 7)} weeks.`;
  }
  return `You've been here over a month.`;
}

// Generate "Day X" or "Since {weekday}" metadata
function getLiveMetadata(arrivalDate: string): string {
  const arrival = new Date(arrivalDate);
  const today = new Date();
  const days = differenceInDays(today, arrival);
  
  if (days === 0) {
    return 'Day 1';
  }
  if (days <= 6) {
    return `Since ${format(arrival, 'EEEE')}`;
  }
  return `Day ${days + 1}`;
}

export function TodayEntry({ onAddTrip }: TodayEntryProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: travelState, isLoading } = useTravelState();
  const endTripMutation = useEndCurrentTrip();
  const generateLetter = useGenerateLetter();
  const [meetModalOpen, setMeetModalOpen] = useState(false);
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

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

  // "Travelling" state — Ongoing entry, alive and present
  const currentTrip = travelState.currentTrip!;
  const country = getCountryByIso(currentTrip.country_iso2);
  if (!country) return null;

  const generateLetter = useGenerateLetter();

  const handleEndEntry = () => {
    const arrivalDate = currentTrip.arrival_date;
    const departureDate = new Date().toISOString().split('T')[0];
    
    endTripMutation.mutate(currentTrip.id, {
      onSuccess: () => {
        setEndModalOpen(false);
        // Auto-generate a letter for this completed entry
        generateLetter.mutate({
          scope: 'trip',
          period_start: arrivalDate,
          period_end: departureDate,
        });
      }
    });
  };

  // Create a visit object for EditVisitModal (only fields it needs)
  const visitForEdit = {
    id: currentTrip.id,
    country_iso2: currentTrip.country_iso2,
    arrival_date: currentTrip.arrival_date,
    departure_date: null as string | null,
  };

  return (
    <>
      {/* — NOW — band */}
      <div className="now-band">
        <span className="now-band-line" />
        <span className="now-band-text">Now</span>
        <span className="now-band-line" />
      </div>

      <article className="journal-entry journal-entry--ongoing">
        {/* Live metadata - Day X or Since {weekday} */}
        <p className="journal-live-meta">{getLiveMetadata(currentTrip.arrival_date)}</p>
        
        <p className="journal-date">{dateStr}</p>
        
        {/* Pulsing dot indicator */}
        <div className="journal-pulse-dot" aria-hidden="true" />
        
        <h1 className="journal-title journal-title--ongoing">
          {country.name}
        </h1>
        
        {/* Present-tense, alive copy */}
        <p className="journal-body journal-body--ongoing">
          {getOngoingCopy(currentTrip.arrival_date)}
        </p>
        
        {/* Subtle presence whisper */}
        <p className="journal-whisper">Still here.</p>
        
        {/* Primary action */}
        <nav className="journal-actions journal-actions--ongoing">
          <button 
            onClick={() => setEditModalOpen(true)}
            className="journal-link journal-link--primary"
          >
            Update entry
          </button>
        </nav>
        
        {/* Secondary actions - margin notes style */}
        <nav className="journal-margin-notes">
          <button 
            onClick={() => navigate(`/country/${currentTrip.country_iso2}`)} 
            className="journal-margin-note"
          >
            View place
          </button>
          <button 
            onClick={() => setMeetModalOpen(true)}
            className="journal-margin-note"
          >
            Connections
          </button>
          <button 
            onClick={() => setEndModalOpen(true)}
            className="journal-margin-note"
          >
            End entry
          </button>
        </nav>
      </article>

      <MeetInPersonModal
        open={meetModalOpen}
        onOpenChange={setMeetModalOpen}
        tripId={currentTrip.trip_id || currentTrip.id}
      />

      <EndEntryModal
        open={endModalOpen}
        onOpenChange={setEndModalOpen}
        countryIso2={currentTrip.country_iso2}
        arrivalDate={currentTrip.arrival_date}
        onConfirm={handleEndEntry}
        isPending={endTripMutation.isPending}
      />

      <EditVisitModal
        visit={visitForEdit}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />
    </>
  );
}
