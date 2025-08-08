import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2, Eye, EyeOff, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Calendar {
  id: string;
  name: string;
  color_code: string;
  url: string;
  is_visible: boolean;
  external_source: string;
  external_id?: string;
}

export function CalendarManager() {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCalendars();
    }
  }, [user]);

  const fetchCalendars = async () => {
    try {
      const { data, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCalendars(data || []);
    } catch (error) {
      console.error('Error fetching calendars:', error);
      toast({
        title: "Error",
        description: "Failed to load calendars",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCalendarVisibility = async (calendarId: string, isVisible: boolean) => {
    try {
      const { error } = await supabase
        .from('calendars')
        .update({ is_visible: isVisible })
        .eq('id', calendarId);

      if (error) throw error;

      setCalendars(prev => prev.map(cal => 
        cal.id === calendarId ? { ...cal, is_visible: isVisible } : cal
      ));

      toast({
        title: "Success",
        description: `Calendar ${isVisible ? 'shown' : 'hidden'}`,
      });
    } catch (error) {
      console.error('Error updating calendar visibility:', error);
      toast({
        title: "Error",
        description: "Failed to update calendar visibility",
        variant: "destructive",
      });
    }
  };

  const updateCalendarColor = async (calendarId: string, colorCode: string) => {
    try {
      const { error } = await supabase
        .from('calendars')
        .update({ color_code: colorCode })
        .eq('id', calendarId);

      if (error) throw error;

      setCalendars(prev => prev.map(cal => 
        cal.id === calendarId ? { ...cal, color_code: colorCode } : cal
      ));

      toast({
        title: "Success",
        description: "Calendar color updated",
      });
    } catch (error) {
      console.error('Error updating calendar color:', error);
      toast({
        title: "Error",
        description: "Failed to update calendar color",
        variant: "destructive",
      });
    }
  };

  const deleteCalendar = async (calendarId: string) => {
    try {
      const { error } = await supabase
        .from('calendars')
        .delete()
        .eq('id', calendarId);

      if (error) throw error;

      setCalendars(prev => prev.filter(cal => cal.id !== calendarId));

      toast({
        title: "Success",
        description: "Calendar deleted",
      });
    } catch (error) {
      console.error('Error deleting calendar:', error);
      toast({
        title: "Error",
        description: "Failed to delete calendar",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-4">Loading calendars...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Imported Calendars</h3>
      </div>

      {calendars.length === 0 ? (
        <div className="text-center p-6 text-muted-foreground">
          No calendars imported yet. Use the calendar import feature to add external calendars.
        </div>
      ) : (
        <div className="space-y-3">
          {calendars.map((calendar) => (
            <div
              key={calendar.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-card"
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full border-2"
                  style={{ backgroundColor: calendar.color_code }}
                />
                <div>
                  <div className="font-medium">{calendar.name}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {calendar.external_source} Calendar
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Label htmlFor={`color-${calendar.id}`} className="sr-only">
                    Calendar Color
                  </Label>
                  <Input
                    id={`color-${calendar.id}`}
                    type="color"
                    value={calendar.color_code}
                    onChange={(e) => updateCalendarColor(calendar.id, e.target.value)}
                    className="w-8 h-8 p-0 border-0 cursor-pointer"
                  />
                  <Palette className="w-4 h-4 text-muted-foreground" />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={calendar.is_visible}
                    onCheckedChange={(checked) => 
                      updateCalendarVisibility(calendar.id, checked)
                    }
                  />
                  {calendar.is_visible ? (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteCalendar(calendar.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}