import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  color_code?: string;
  calendar_id?: string;
  external_source?: string;
  calendar?: {
    name: string;
    color_code: string;
    is_visible: boolean;
  };
}

export function useCalendarEvents(startDate?: Date, endDate?: Date) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user, startDate, endDate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('events')
        .select(`
          *,
          calendars!inner(
            name,
            color_code,
            is_visible
          )
        `)
        .eq('user_id', user?.id)
        .eq('calendars.is_visible', true);

      if (startDate) {
        query = query.gte('start_time', startDate.toISOString());
      }
      
      if (endDate) {
        query = query.lte('start_time', endDate.toISOString());
      }

      const { data, error } = await query.order('start_time', { ascending: true });

      if (error) throw error;

      const formattedEvents: CalendarEvent[] = (data || []).map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        start_time: event.start_time,
        end_time: event.end_time,
        color_code: event.color_code || event.calendars?.color_code,
        calendar_id: event.calendar_id,
        external_source: event.external_source,
        calendar: event.calendars
      }));

      setEvents(formattedEvents);
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  return { events, loading, error, refetch: fetchEvents };
}