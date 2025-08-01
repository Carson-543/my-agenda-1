import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PomodoroSettings {
  work_duration: number;
  break_duration: number;
  long_break_duration: number;
}

const Pomodoro = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PomodoroSettings>({
    work_duration: 25,
    break_duration: 5,
    long_break_duration: 15,
  });
  
  const [currentSession, setCurrentSession] = useState<'work' | 'break' | 'long_break'>('work');
  const [timeLeft, setTimeLeft] = useState(settings.work_duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  useEffect(() => {
    // Update time when session type changes
    const duration = getCurrentSessionDuration();
    setTimeLeft(duration * 60);
  }, [currentSession, settings]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('pomodoro_settings')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      
      if (data?.pomodoro_settings) {
        setSettings(data.pomodoro_settings as unknown as PomodoroSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const getCurrentSessionDuration = () => {
    switch (currentSession) {
      case 'break':
        return settings.break_duration;
      case 'long_break':
        return settings.long_break_duration;
      default:
        return settings.work_duration;
    }
  };

  const handleSessionComplete = async () => {
    setIsRunning(false);
    
    if (currentSession === 'work') {
      // Save completed pomodoro session
      try {
        await supabase
          .from('pomodoro_sessions')
          .insert([
            {
              user_id: user?.id,
              duration_minutes: settings.work_duration,
              session_type: 'work',
            }
          ]);

        setSessionsCompleted(prev => prev + 1);
        
        // Determine next session type
        const newSessionsCompleted = sessionsCompleted + 1;
        if (newSessionsCompleted % 4 === 0) {
          setCurrentSession('long_break');
          toast({
            title: "Great work!",
            description: "Time for a long break. You've completed 4 pomodoros!",
          });
        } else {
          setCurrentSession('break');
          toast({
            title: "Pomodoro complete!",
            description: "Time for a short break.",
          });
        }
      } catch (error) {
        console.error('Error saving session:', error);
      }
    } else {
      // Break finished
      setCurrentSession('work');
      toast({
        title: "Break over!",
        description: "Ready for another focused session?",
      });
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getCurrentSessionDuration() * 60);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const totalTime = getCurrentSessionDuration() * 60;
    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  const getSessionColor = () => {
    switch (currentSession) {
      case 'break':
        return 'text-task';
      case 'long_break':
        return 'text-personal';
      default:
        return 'text-primary';
    }
  };

  const getSessionTitle = () => {
    switch (currentSession) {
      case 'break':
        return 'Short Break';
      case 'long_break':
        return 'Long Break';
      default:
        return 'Focus Time';
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Main Timer */}
      <Card className="text-center">
        <CardHeader>
          <CardTitle className={`text-2xl ${getSessionColor()}`}>
            {getSessionTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer Display */}
          <div className="space-y-4">
            <div className={`text-6xl font-mono font-bold ${getSessionColor()}`}>
              {formatTime(timeLeft)}
            </div>
            <Progress value={getProgress()} className="h-2" />
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">
            <Button
              size="lg"
              onClick={toggleTimer}
              className="w-16 h-16 rounded-full"
            >
              {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={resetTimer}
              className="w-16 h-16 rounded-full"
            >
              <RotateCcw className="h-6 w-6" />
            </Button>
          </div>

          {/* Session Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Sessions Today</p>
              <p className="text-lg font-semibold">{sessionsCompleted}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Next Session</p>
              <p className="text-lg font-semibold">
                {currentSession === 'work' 
                  ? (sessionsCompleted + 1) % 4 === 0 ? 'Long Break' : 'Short Break'
                  : 'Focus Time'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Session Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button
          variant={currentSession === 'work' ? 'default' : 'outline'}
          onClick={() => {
            setCurrentSession('work');
            setIsRunning(false);
          }}
          className="h-16 flex flex-col"
        >
          <span className="font-semibold">{settings.work_duration}m</span>
          <span className="text-xs">Focus</span>
        </Button>
        <Button
          variant={currentSession === 'break' ? 'default' : 'outline'}
          onClick={() => {
            setCurrentSession('break');
            setIsRunning(false);
          }}
          className="h-16 flex flex-col"
        >
          <span className="font-semibold">{settings.break_duration}m</span>
          <span className="text-xs">Break</span>
        </Button>
        <Button
          variant={currentSession === 'long_break' ? 'default' : 'outline'}
          onClick={() => {
            setCurrentSession('long_break');
            setIsRunning(false);
          }}
          className="h-16 flex flex-col"
        >
          <span className="font-semibold">{settings.long_break_duration}m</span>
          <span className="text-xs">Long Break</span>
        </Button>
      </div>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today's Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Completed Sessions</span>
              <span className="font-semibold">{sessionsCompleted}</span>
            </div>
            <div className="flex justify-between">
              <span>Focus Time</span>
              <span className="font-semibold">{sessionsCompleted * settings.work_duration}m</span>
            </div>
            <div className="flex justify-between">
              <span>Break Time</span>
              <span className="font-semibold">
                {Math.floor(sessionsCompleted / 4) * settings.long_break_duration + 
                 (sessionsCompleted % 4) * settings.break_duration}m
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Pomodoro;