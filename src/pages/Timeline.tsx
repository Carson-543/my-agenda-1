import { useState, useEffect } from 'react';
import { format, startOfDay, addHours, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location: string | null;
  color_code: string | null;
}

const Timeline = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate time slots (24 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = addHours(startOfDay(currentDate), i);
    return hour;
  });

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user, currentDate]);

  const fetchEvents = async () => {
    try {
      const startOfToday = startOfDay(currentDate);
      const endOfToday = addHours(startOfToday, 24);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user?.id)
        .gte('start_time', startOfToday.toISOString())
        .lt('start_time', endOfToday.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventsForHour = (hour: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      return eventStart.getHours() === hour.getHours() && isSameDay(eventStart, hour);
    });
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigateDay('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <h2 className="text-lg font-semibold">
              {format(currentDate, 'EEEE, MMMM d')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {format(currentDate, 'yyyy')}
            </p>
          </div>
          
          <Button variant="ghost" size="icon" onClick={() => navigateDay('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <Button className="w-full mt-3" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading timeline...</div>
          </div>
        ) : (
          <div className="relative">
            {/* Current time indicator */}
            {isSameDay(currentDate, new Date()) && (
              <div 
                className="absolute left-0 right-0 border-t-2 border-primary z-10"
                style={{
                  top: `${(new Date().getHours() * 60 + new Date().getMinutes()) / 60 * 80}px`
                }}
              >
                <div className="w-2 h-2 bg-primary rounded-full -mt-1 ml-14" />
              </div>
            )}

            {/* Time slots */}
            {timeSlots.map((hour, index) => {
              const hourEvents = getEventsForHour(hour);
              const isCurrentHour = isSameDay(currentDate, new Date()) && 
                                  hour.getHours() === new Date().getHours();

              return (
                <div key={index} className="flex min-h-[80px] border-b border-border">
                  {/* Time label */}
                  <div className="w-16 flex-shrink-0 p-2 text-sm text-muted-foreground text-right">
                    {format(hour, 'HH:mm')}
                  </div>
                  
                  {/* Event area */}
                  <div className={`flex-1 p-2 relative ${isCurrentHour ? 'bg-primary/5' : ''}`}>
                    {hourEvents.map((event) => {
                      const eventStart = new Date(event.start_time);
                      const eventEnd = new Date(event.end_time);
                      const durationHours = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60);
                      const height = Math.max(durationHours * 80, 40);
                      
                      return (
                        <Card 
                          key={event.id} 
                          className="mb-1 border-l-4 hover:shadow-md transition-shadow cursor-pointer"
                          style={{ 
                            borderLeftColor: event.color_code || '#3B82F6',
                            height: `${height}px`
                          }}
                        >
                          <CardContent className="p-2">
                            <h4 className="font-medium text-sm leading-tight">{event.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(eventStart, 'HH:mm')} - {format(eventEnd, 'HH:mm')}
                            </p>
                            {event.location && (
                              <p className="text-xs text-muted-foreground">{event.location}</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                    
                    {/* Empty slot - clickable area for new events */}
                    {hourEvents.length === 0 && (
                      <div className="h-full min-h-[60px] rounded border-2 border-dashed border-transparent hover:border-muted-foreground/20 flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer">
                        <Plus className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Timeline;