import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const MILESTONES = [1, 5, 10, 25, 50, 100];
const STORAGE_KEY = 'waymark_seen_milestones';

function getLocalSeen(): number[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function isoToFlag(iso2: string): string {
  return [...iso2.toUpperCase()]
    .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('');
}

export function useMilestones(visitedIsos: string[]) {
  const { user } = useAuth();
  const countryCount = visitedIsos.length;

  const [currentMilestone, setCurrentMilestone] = useState<number | null>(null);
  const [triggerFlag, setTriggerFlag] = useState<string>('');
  const [seen, setSeen] = useState<number[]>(getLocalSeen);
  const [loaded, setLoaded] = useState(false);
  const savingRef = useRef(false);

  // Load seen milestones from profiles table on login
  useEffect(() => {
    if (!user) {
      setLoaded(true);
      return;
    }

    supabase
      .from('profiles')
      .select('seen_milestones')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        const remote: number[] = Array.isArray(data?.seen_milestones) ? data.seen_milestones : [];
        const local = getLocalSeen();
        const merged = [...new Set([...local, ...remote])];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        setSeen(merged);
        setLoaded(true);
      });
  }, [user?.id]);

  // Check for newly hit milestones once seen list is loaded
  useEffect(() => {
    if (!loaded || countryCount === 0) return;

    const hit = MILESTONES.filter(m => countryCount >= m && !seen.includes(m));
    if (hit.length === 0) return;

    const milestone = hit[hit.length - 1];
    const newSeen = [...seen, milestone];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSeen));
    setSeen(newSeen);

    // Persist to profiles table — unaffected by OAuth provider overwrites
    if (user && !savingRef.current) {
      savingRef.current = true;
      Promise.resolve(
        supabase
          .from('profiles')
          .update({ seen_milestones: newSeen })
          .eq('user_id', user.id)
      ).finally(() => { savingRef.current = false; });
    }

    setTriggerFlag(visitedIsos.length > 0 ? isoToFlag(visitedIsos[visitedIsos.length - 1]) : '🌍');
    setCurrentMilestone(milestone);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCount, loaded]);

  const dismiss = () => setCurrentMilestone(null);

  return { currentMilestone, triggerFlag, dismiss };
}
