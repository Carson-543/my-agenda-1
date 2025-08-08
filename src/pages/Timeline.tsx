import { useState, useEffect } from 'react';
import { format, startOfDay, addHours, isSameDay, endOfDay } from 'date-fns';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AddEventDialog } from '@/components/AddEventDialog';
import { CalendarIntegrationDialog } from '@/components/CalendarIntegrationDialog';

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

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  category_id: string | null;
  is_completed: boolean;
}

interface Category {
  id: string;
  name: string;
  color_code: string;
}

const Timeline = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Use the calendar events hook to get external calendar events
  const { events: calendarEvents, loading: calendarLoading } = useCalendarEvents(
    startOfDay(currentDate), 
    endOfDay(currentDate)
  );

  // Generate time slots (24 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = addHours(startOfDay(currentDate), i);
    return hour;
  });

  useEffect(() => {
    if (user) {
      fetchEvents();
      fetchTasks();
      fetchCategories();
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

  const fetchTasks = async () => {
    try {
      const startOfToday = startOfDay(currentDate);
      const endOfToday = addHours(startOfToday, 24);

      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, due_date, category_id, is_completed')
        .eq('user_id', user?.id)
        .gte('due_date', startOfToday.toISOString())
        .lt('due_date', endOfToday.toISOString())
        .eq('is_completed', false)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
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
        
        <div className="flex gap-2 mt-3">
          <AddEventDialog selectedDate={currentDate} onEventAdded={fetchEvents}>
            <Button className="flex-1" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </AddEventDialog>
          <CalendarIntegrationDialog onEventsImported={fetchEvents}>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4" />
            </Button>
          </CalendarIntegrationDialog>
        </div>
      </div>

      {/* Due Tasks Today */}
      {tasks.length > 0 && (
        <Card className="mx-4 mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Due Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.map((task) => {
              const category = categories.find(cat => cat.id === task.category_id);
              return (
                <div 
                  key={task.id} 
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: category?.color_code || '#6B7280' }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{task.title}</p>
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground">
                        Due: {format(new Date(task.due_date), 'HH:mm')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* External Calendar Events */}
      {calendarEvents.length > 0 && (
        <Card className="mx-4 mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              External Calendar Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {calendarEvents.map((event) => (
              <div 
                key={event.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: event.color_code || '#10B981' }}
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{event.title}</p>
                  {event.calendar && (
                    <p className="text-xs text-muted-foreground">
                      {event.calendar.name}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(event.start_time), 'HH:mm')}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {loading || calendarLoading ? (
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
                      <AddEventDialog selectedDate={currentDate} selectedHour={hour.getHours()} onEventAdded={fetchEvents}>
                        <div className="h-full min-h-[60px] rounded border-2 border-dashed border-transparent hover:border-muted-foreground/20 flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer">
                          <Plus className="h-4 w-4" />
                        </div>
                      </AddEventDialog>
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