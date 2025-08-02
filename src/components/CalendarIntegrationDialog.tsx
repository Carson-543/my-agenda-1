import { useState } from 'react';
import { Globe, Calendar, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface CalendarIntegrationDialogProps {
  children: React.ReactNode;
  onEventsImported?: () => void;
}

export function CalendarIntegrationDialog({ children, onEventsImported }: CalendarIntegrationDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [googleCalendarUrl, setGoogleCalendarUrl] = useState('');
  const [icsData, setIcsData] = useState('');
  const [loading, setLoading] = useState(false);

  const parseICSData = (icsContent: string) => {
    const events = [];
    const fixedICS = icsContent.replace(/\r?\n /g, ''); // Fix multiline fields
    const lines = fixedICS.split('\n');
    let currentEvent: any = {};
    let inEvent = false;

    for (let line of lines) {
      line = line.trim();
      if (line === 'BEGIN:VEVENT') {
        inEvent = true;
        currentEvent = {};
      } else if (line === 'END:VEVENT' && inEvent) {
        if (currentEvent.SUMMARY && currentEvent.DTSTART) {
          events.push(currentEvent);
        }
        inEvent = false;
      } else if (inEvent && line.includes(':')) {
        const [keyRaw, ...valueParts] = line.split(':');
        const key = keyRaw.split(';')[0]; // Strip metadata like DTSTART;VALUE=DATE
        const value = valueParts.join(':');
        currentEvent[keyRaw] = value;
        currentEvent[key] ??= value;
      }
    }

    return events;
  };

  const formatICSDateTime = (icsDateTime: string) => {
    try {
      const normalized = icsDateTime.replace(/Z$/, '').replace('T', '');
      const year = normalized.slice(0, 4);
      const month = normalized.slice(4, 6);
      const day = normalized.slice(6, 8);
      const hour = normalized.slice(8, 10) || '00';
      const minute = normalized.slice(10, 12) || '00';
      const second = normalized.slice(12, 14) || '00';
      return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
    } catch {
      return new Date();
    }
  };

  const importFromGoogleCalendar = async () => {
    if (!googleCalendarUrl.trim()) return;
    setLoading(true);

    try {
      let calendarId = '';

      // Match src=... or cid=...
      const match = googleCalendarUrl.match(/(?:src=|cid=)([^&]+)/);
      if (match) {
        calendarId = decodeURIComponent(match[1]);
      } else {
        calendarId = googleCalendarUrl.trim();
      }

      if (!calendarId) throw new Error('Invalid Google Calendar URL or ID');

      const icsUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;

      const response = await fetch(icsUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch calendar data. Make sure the calendar is public.');
      }

      const icsContent = await response.text();
      await processICSData(icsContent);

      setGoogleCalendarUrl('');
      setOpen(false);
    } catch (error) {
      console.error('Error importing Google Calendar:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import Google Calendar. Please check the URL and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const importFromICS = async () => {
    if (!icsData.trim()) return;
    setLoading(true);

    try {
      await processICSData(icsData);
      setIcsData('');
      setOpen(false);
    } catch (error) {
      console.error('Error importing ICS:', error);
      toast({
        title: 'Import failed',
        description: 'Failed to import ICS data. Please check the format and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const processICSData = async (icsContent: string) => {
    const events = parseICSData(icsContent);

    if (events.length === 0) throw new Error('No valid events found in the calendar data');

    const eventsToInsert = events.map((event) => {
      const rawStart = event['DTSTART'] || '';
      const rawEnd = event['DTEND'] || '';

      const isAllDay = rawStart.includes('VALUE=DATE') || !rawStart.includes('T');
      const startTime = formatICSDateTime(rawStart);
      const endTime = rawEnd ? formatICSDateTime(rawEnd) : new Date(startTime.getTime() + 60 * 60 * 1000); // Default to 1 hr

      return {
        title: event.SUMMARY || 'Imported Event',
        description: event.DESCRIPTION || null,
        location: event.LOCATION || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        all_day: isAllDay,
        color_code: '#10B981',
        user_id: user?.id,
        external_source: 'imported',
        sync_status: 'imported',
      };
    });

    const { error } = await supabase.from('events').insert(eventsToInsert);
    if (error) throw error;

    toast({
      title: 'Import successful',
      description: `Successfully imported ${events.length} events.`,
    });

    onEventsImported?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Calendar</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="google" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="google">Google Calendar</TabsTrigger>
            <TabsTrigger value="ics">ICS File</TabsTrigger>
          </TabsList>

          <TabsContent value="google" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Google Calendar URL
                </CardTitle>
                <CardDescription>
                  Import events from a public Google Calendar using its public URL or calendar ID.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="google-url">Calendar URL or ID</Label>
                  <Input
                    id="google-url"
                    value={googleCalendarUrl}
                    onChange={(e) => setGoogleCalendarUrl(e.target.value)}
                    placeholder="https://calendar.google.com/calendar/embed?src=..."
                  />
                  <p className="text-xs text-muted-foreground">
                    The calendar must be publicly accessible. You can also paste just the calendar ID.
                  </p>
                </div>

                <Button onClick={importFromGoogleCalendar} disabled={loading || !googleCalendarUrl.trim()} className="w-full">
                  {loading ? 'Importing...' : 'Import from Google Calendar'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  ICS Data
                </CardTitle>
                <CardDescription>Paste the contents of an ICS calendar file to import events.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ics-data">ICS Content</Label>
                  <Textarea
                    id="ics-data"
                    value={icsData}
                    onChange={(e) => setIcsData(e.target.value)}
                    placeholder="BEGIN:VCALENDAR&#10;VERSION:2.0&#10;..."
                    rows={10}
                  />
                  <p className="text-xs text-muted-foreground">Copy and paste the entire contents of an .ics file here.</p>
                </div>

                <Button onClick={importFromICS} disabled={loading || !icsData.trim()} className="w-full">
                  {loading ? 'Importing...' : 'Import from ICS'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
