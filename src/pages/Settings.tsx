import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LogOut, User, Timer, Palette, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PomodoroSettings {
  work_duration: number;
  break_duration: number;
  long_break_duration: number;
}

interface Profile {
  display_name: string;
  pomodoro_settings: PomodoroSettings;
}

const Settings = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      
      setProfile({
        display_name: data.display_name || '',
        pomodoro_settings: (data.pomodoro_settings as unknown as PomodoroSettings) || {
          work_duration: 25,
          break_duration: 5,
          long_break_duration: 15,
        },
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profile.display_name,
          pomodoro_settings: profile.pomodoro_settings as any,
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePomodoroSetting = (key: keyof PomodoroSettings, value: number) => {
    if (!profile) return;
    
    setProfile({
      ...profile,
      pomodoro_settings: {
        ...profile.pomodoro_settings,
        [key]: value,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={profile?.display_name || ''}
              onChange={(e) => 
                profile && setProfile({ ...profile, display_name: e.target.value })
              }
              placeholder="Enter your display name"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pomodoro Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Pomodoro Timer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="work-duration">Work Duration (minutes)</Label>
              <Input
                id="work-duration"
                type="number"
                min="1"
                max="120"
                value={profile?.pomodoro_settings.work_duration || 25}
                onChange={(e) => 
                  updatePomodoroSetting('work_duration', parseInt(e.target.value) || 25)
                }
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="break-duration">Short Break (minutes)</Label>
              <Input
                id="break-duration"
                type="number"
                min="1"
                max="60"
                value={profile?.pomodoro_settings.break_duration || 5}
                onChange={(e) => 
                  updatePomodoroSetting('break_duration', parseInt(e.target.value) || 5)
                }
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="long-break-duration">Long Break (minutes)</Label>
              <Input
                id="long-break-duration"
                type="number"
                min="1"
                max="120"
                value={profile?.pomodoro_settings.long_break_duration || 15}
                onChange={(e) => 
                  updatePomodoroSetting('long_break_duration', parseInt(e.target.value) || 15)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color System Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-deadline" />
              <span>Deadlines</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-driving" />
              <span>Driving Time</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-prep" />
              <span>Prep/Buffer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-task" />
              <span>Task Work</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-event" />
              <span>Calendar Events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-personal" />
              <span>Personal Time</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button 
          onClick={saveProfile} 
          className="w-full" 
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        
        <Separator />
        
        <Button 
          variant="destructive" 
          onClick={signOut}
          className="w-full"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Settings;