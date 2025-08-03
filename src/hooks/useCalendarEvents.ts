import { useState, useEffect } from "react";
import ICAL from "ical.js";

export interface CalendarEvent {
  summary: string;
  location?: string;
  description?: string;
  start: Date;
  end: Date;
}

export function useCalendarEvents(icsUrl: string) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCalendar() {
      try {
        const res = await fetch(icsUrl);
        const icsText = await res.text();

        // DEBUG: show raw ICS text in an alert if parsing fails
        let jcalData;
        try {
          jcalData = ICAL.parse(icsText);
        } catch (parseErr) {
          alert("Failed to parse ICS file. Raw ICS:\n\n" + icsText);
          throw parseErr;
        }

        const comp = new ICAL.Component(jcalData);
        const vevents = comp.getAllSubcomponents("vevent");

        if (!vevents || vevents.length === 0) {
          alert("No events found in calendar:\n\n" + icsText);
          throw new Error("No valid events found in the calendar data");
        }

        const parsedEvents = vevents.map((ve) => {
          const event = new ICAL.Event(ve);
          return {
            summary: event.summary,
            location: event.location,
            description: event.description,
            start: event.startDate.toJSDate(),
            end: event.endDate.toJSDate(),
          };
        });

        parsedEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
        setEvents(parsedEvents);
      } catch (error) {
        console.error("Failed to fetch calendar events", error);
        alert("Error fetching calendar:\n" + error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCalendar();
  }, [icsUrl]);

  return { events, loading };
}
