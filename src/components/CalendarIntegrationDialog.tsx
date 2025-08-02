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
    const lines = icsContent.split('\n');
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
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':');
        currentEvent[key] = value;
      }
    }

    return events;
  };

  const formatICSDateTime = (icsDateTime: string) => {
    // Handle different ICS datetime formats
    if (icsDateTime.includes('T')) {
      // Format: 20231201T120000 or 20231201T120000Z
      const cleaned = icsDateTime.replace(/[TZ]/g, '');
      if (cleaned.length >= 8) {
        const year = cleaned.substring(0, 4);
        const month = cleaned.substring(4, 6);
        const day = cleaned.substring(6, 8);
        const hour = cleaned.substring(8, 10) || '00';
        const minute = cleaned.substring(10, 12) || '00';
        const second = cleaned.substring(12, 14) || '00';
        
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
      }
    }
    
    // Fallback to current parsing
    try {
      return new Date(icsDateTime);
    } catch {
      return new Date();
    }
  };

  const importFromGoogleCalendar = async () => {
    if (!googleCalendarUrl.trim()) return;

    setLoading(true);
    try {
      // Extract calendar ID from Google Calendar public URL
      let calendarId = '';
      
      if (googleCalendarUrl.includes('calendar.google.com')) {
        const urlMatch = googleCalendarUrl.match(/calendar\/embed\?src=([^&]+)/);
        if (urlMatch) {
          calendarId = decodeURIComponent(urlMatch[1]);
        }
      } else {
        calendarId = googleCalendarUrl;
      }

      if (!calendarId) {
        throw new Error('Invalid Google Calendar URL');
      }

      // Construct ICS URL
      const icsUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
      
      // Fetch ICS data
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
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import Google Calendar. Please check the URL and try again.",
        variant: "destructive",
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
        title: "Import failed",
        description: "Failed to import ICS data. Please check the format and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processICSData = async (icsContent: string) => {
    const events = parseICSData(icsContent);
    
    if (events.length === 0) {
      throw new Error('No valid events found in the calendar data');
    }

    const eventsToInsert = events.map(event => {
      const startTime = formatICSDateTime(event.DTSTART);
      const endTime = event.DTEND ? formatICSDateTime(event.DTEND) : new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour
      
      return {
        title: event.SUMMARY || 'Imported Event',
        description: event.DESCRIPTION || null,
        location: event.LOCATION || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        all_day: !event.DTSTART?.includes('T'),
        color_code: '#10B981', // Green for imported events
        user_id: user?.id,
        external_source: 'imported',
        sync_status: 'imported',
      };
    });

    const { error } = await supabase
      .from('events')
      .insert(eventsToInsert);

    if (error) throw error;

    toast({
      title: "Import successful",
      description: `Successfully imported ${events.length} events.`,
    });

    onEventsImported?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
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
                
                <Button 
                  onClick={importFromGoogleCalendar} 
                  disabled={loading || !googleCalendarUrl.trim()}
                  className="w-full"
                >
                  {loading ? "Importing..." : "Import from Google Calendar"}
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
                <CardDescription>
                  Paste the contents of an ICS calendar file to import events.
                </CardDescription>
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
                  <p className="text-xs text-muted-foreground">
                    Copy and paste the entire contents of an .ics file here.
                  </p>
                </div>
                
                <Button 
                  onClick={importFromICS} 
                  disabled={loading || !icsData.trim()}
                  className="w-full"
                >
                  {loading ? "Importing..." : "Import from ICS"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}