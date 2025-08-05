import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Calendar, Upload, Download, AlertCircle } from 'lucide-react';
import { useExternalCalendar } from '@/hooks/useExternalCalendar';

interface CalendarIntegrationDialogProps {
  children: React.ReactNode;
  onEventsImported?: () => void;
}

export function CalendarIntegrationDialog({ children, onEventsImported }: CalendarIntegrationDialogProps) {
  const [open, setOpen] = useState(false);
  const [calendarUrl, setCalendarUrl] = useState('');
  const [importedData, setImportedData] = useState('');
  const { events, loading, error, importFromUrl, clearEvents } = useExternalCalendar();

  const handleImportFromUrl = async () => {
    if (calendarUrl.trim()) {
      await importFromUrl(calendarUrl);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Calendar</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="calendar-url">Calendar URL</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://calendar.google.com/calendar/ical/... or any .ics URL"
                value={calendarUrl}
                onChange={(e) => setCalendarUrl(e.target.value)}
              />
              <Button onClick={handleImportFromUrl} disabled={loading}>
                {loading ? 'Importing...' : 'Import'}
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <div className="space-y-2">
                <div>
                  <strong>Google Calendar:</strong> Use any Google Calendar share URL or embed URL.
                </div>
                <div>
                  <strong>Other Calendars:</strong> Supports Outlook, iCloud, and any public .ics calendar URL.
                </div>
                <div className="text-xs opacity-75 bg-amber-50 dark:bg-amber-950 p-2 rounded border border-amber-200 dark:border-amber-800">
                  <strong>Important:</strong> For Google Calendar to work, you need to:
                  <br />1. Enable the Google Calendar API in Google Cloud Console
                  <br />2. Make sure your API key has access to the Calendar API
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            )}

            {events.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Preview ({events.length} events found)</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {events.slice(0, 5).map((event, index) => (
                    <div key={index} className="text-sm p-2 bg-muted rounded">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-muted-foreground">
                        {event.start.toLocaleDateString()} at {event.start.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                  {events.length > 5 && (
                    <div className="text-sm text-muted-foreground">
                      ... and {events.length - 5} more events
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => clearEvents()} variant="outline" size="sm">
                    Clear Preview
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
