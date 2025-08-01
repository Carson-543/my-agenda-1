import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color_code: string | null;
}

const MonthView = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user, currentDate]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user?.id)
        .gte('start_time', monthStart.toISOString())
        .lte('end_time', monthEnd.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      return isSameDay(eventStart, day);
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  // Create calendar grid with proper week layout
  const calendarDays = [];
  const firstDay = new Date(monthStart);
  firstDay.setDate(firstDay.getDate() - firstDay.getDay()); // Start from Sunday

  for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
    const day = new Date(firstDay);
    day.setDate(day.getDate() + i);
    calendarDays.push(day);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-xl font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          
          <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading calendar...</div>
          </div>
        ) : (
          <div className="grid grid-cols-7 h-full">
            {calendarDays.map((day, index) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              
              return (
                <div
                  key={index}
                  className={cn(
                    "border-r border-b border-border p-1 min-h-[100px] flex flex-col",
                    !isCurrentMonth && "bg-muted/20",
                    isCurrentDay && "bg-primary/5"
                  )}
                >
                  {/* Day number */}
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isCurrentDay && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center",
                        !isCurrentMonth && "text-muted-foreground"
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className="text-xs p-1 rounded truncate border-l-2"
                        style={{ 
                          borderLeftColor: event.color_code || '#3B82F6',
                          backgroundColor: `${event.color_code || '#3B82F6'}20`
                        }}
                      >
                        {event.all_day ? (
                          <span className="font-medium">{event.title}</span>
                        ) : (
                          <>
                            <span className="font-medium">{format(new Date(event.start_time), 'HH:mm')}</span>
                            <span className="ml-1">{event.title}</span>
                          </>
                        )}
                      </div>
                    ))}
                    
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 3} more
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

export default MonthView;