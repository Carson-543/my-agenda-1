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
      const icsUrl = convertToIcsUrl(url);
      console.log('Fetching calendar from:', icsUrl);
      
      // Add CORS proxy for external calendars
      const proxyUrl = icsUrl.startsWith('https://calendar.google.com') 
        ? icsUrl 
        : `https://api.allorigins.win/get?url=${encodeURIComponent(icsUrl)}`;
      
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch calendar: ${response.status} ${response.statusText}`);
      }
      
      let icsText: string;
      
      if (proxyUrl.includes('allorigins.win')) {
        const data = await response.json();
        icsText = data.contents;
      } else {
        icsText = await response.text();
      }
      
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