import { useState } from 'react';
import ICAL from 'ical.js';

interface ExternalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
}

interface UseExternalCalendarReturn {
  events: ExternalEvent[];
  loading: boolean;
  error: string | null;
  importFromUrl: (url: string) => Promise<void>;
  clearEvents: () => void;
}

export const useExternalCalendar = (): UseExternalCalendarReturn => {
  const [events, setEvents] = useState<ExternalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectCalendarType = (url: string): 'google' | 'outlook' | 'icloud' | 'ics' => {
    if (url.includes('calendar.google.com')) return 'google';
    if (url.includes('outlook.live.com') || url.includes('outlook.office365.com')) return 'outlook';
    if (url.includes('icloud.com')) return 'icloud';
    return 'ics';
  };

  const convertToIcsUrl = (url: string): string => {
    const type = detectCalendarType(url);
    
    switch (type) {
      case 'google':
        // Convert Google Calendar share URL to ICS format
        if (url.includes('/calendar/embed')) {
          const match = url.match(/src=([^&]+)/);
          if (match) {
            const calendarId = decodeURIComponent(match[1]);
            return `https://calendar.google.com/calendar/ical/${calendarId}/public/basic.ics`;
          }
        }
        return url.replace(/\/calendar\/embed.*/, '') + '/public/basic.ics';
        
      case 'outlook':
        // Outlook URLs are typically already in ICS format or can be converted
        if (!url.endsWith('.ics')) {
          return url + (url.includes('?') ? '&' : '?') + 'format=ics';
        }
        return url;
        
      case 'icloud':
        // iCloud calendar URLs
        return url.replace('webcal://', 'https://');
        
      default:
        return url;
    }
  };

  const importFromUrl = async (url: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const type = detectCalendarType(url);
      
      if (type === 'google') {
        // Extract calendar ID from Google Calendar URL
        let calendarId = '';
        
        if (url.includes('/calendar/embed')) {
          const match = url.match(/src=([^&]+)/);
          if (match) {
            calendarId = decodeURIComponent(match[1]);
          }
        } else if (url.includes('calendar.google.com/calendar/ical/')) {
          const match = url.match(/calendar\/ical\/([^\/]+)/);
          if (match) {
            calendarId = decodeURIComponent(match[1]);
          }
        } else {
          // Try to extract from other Google Calendar URL formats
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split('/');
          const calendarIndex = pathParts.findIndex(part => part === 'calendar');
          if (calendarIndex !== -1 && pathParts[calendarIndex + 1]) {
            calendarId = pathParts[calendarIndex + 1];
          }
        }
        
        if (!calendarId) {
          throw new Error('Could not extract calendar ID from Google Calendar URL');
        }
        
        console.log('Using Google Calendar API for calendar:', calendarId);
        
        // Use our edge function to fetch Google Calendar events
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase.functions.invoke('google-calendar', {
          body: { calendarId }
        });
        
        if (error) {
          console.error('Google Calendar API error:', error);
          if (error.message.includes('403') || error.message.includes('blocked')) {
            throw new Error('Google Calendar API is not enabled. Please enable the Google Calendar API in your Google Cloud Console and ensure your API key has access to it.');
          }
          throw new Error(`Failed to fetch Google Calendar: ${error.message}`);
        }
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        const parsedEvents: ExternalEvent[] = data.events.map((event: any) => ({
          id: event.id,
          title: event.title,
          start: new Date(event.start),
          end: new Date(event.end),
          description: event.description,
          location: event.location,
        }));
        
        // Sort events by start time
        parsedEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
        setEvents(parsedEvents);
        
      } else {
        // Handle other calendar types with ICS parsing
        const icsUrl = convertToIcsUrl(url);
        console.log('Fetching calendar from:', icsUrl);
        
        // Add CORS proxy for external calendars
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(icsUrl)}`;
        
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch calendar: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const icsText = data.contents;
        
        if (!icsText || icsText.length < 50) {
          throw new Error('Invalid or empty calendar data received');
        }
        
        // Parse ICS data
        let jcalData;
        try {
          jcalData = ICAL.parse(icsText);
        } catch (parseErr) {
          console.error('Parse error:', parseErr);
          throw new Error('Failed to parse calendar data. The file may be corrupted or in an unsupported format.');
        }
        
        const comp = new ICAL.Component(jcalData);
        const vevents = comp.getAllSubcomponents("vevent");
        
        if (!vevents || vevents.length === 0) {
          throw new Error("No events found in the calendar");
        }
        
        const parsedEvents: ExternalEvent[] = vevents.map((ve) => {
          const event = new ICAL.Event(ve);
          return {
            id: event.uid || `external-${Math.random()}`,
            title: event.summary || 'Untitled Event',
            start: event.startDate.toJSDate(),
            end: event.endDate.toJSDate(),
            description: event.description || undefined,
            location: event.location || undefined,
          };
        });
        
        // Sort events by start time
        parsedEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
        setEvents(parsedEvents);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Calendar import error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearEvents = () => {
    setEvents([]);
    setError(null);
  };

  return {
    events,
    loading,
    error,
    importFromUrl,
    clearEvents,
  };
};