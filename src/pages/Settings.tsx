import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LogOut, User, Timer, Palette, FolderOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CategoryManager } from '@/components/CategoryManager';

interface PomodoroSettings {
  work_duration: number;
  break_duration: number;
  long_break_duration: number;
}

interface ColorPreferences {
  task: string;
  event: string;
  personal: string;
  prep: string;
  driving: string;
  deadline: string;
  work: string;
  meeting: string;
  study: string;
  exercise: string;
  family: string;
  social: string;
}

interface Profile {
  display_name: string;
  pomodoro_settings: PomodoroSettings;
  color_preferences: ColorPreferences;
}

interface Category {
  id: string;
  name: string;
  color_code: string;
  sort_order: number;
}

const Settings = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
      fetchCategories();
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
        color_preferences: (data.color_preferences as unknown as ColorPreferences) || {
          task: '#3B82F6',
          event: '#10B981',
          personal: '#F59E0B',
          prep: '#EF4444',
          driving: '#8B5CF6',
          deadline: '#F97316',
          work: '#059669',
          meeting: '#7C3AED',
          study: '#DC2626',
          exercise: '#EA580C',
          family: '#0EA5E9',
          social: '#EC4899',
        },
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
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

  const saveProfile = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profile.display_name,
          pomodoro_settings: profile.pomodoro_settings as any,
          color_preferences: profile.color_preferences as any,
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

  const updateColorPreference = (key: keyof ColorPreferences, value: string) => {
    if (!profile) return;
    
    setProfile({
      ...profile,
      color_preferences: {
        ...profile.color_preferences,
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

      {/* Color Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(profile?.color_preferences || {}).map(([key, color]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`color-${key}`} className="capitalize font-medium">
                  {key === 'prep' ? 'Prep/Buffer' : 
                   key === 'task' ? 'General Tasks' : 
                   key === 'event' ? 'Calendar Events' :
                   key === 'personal' ? 'Personal Time' :
                   key === 'driving' ? 'Driving Time' :
                   key === 'deadline' ? 'Deadlines' :
                   key === 'work' ? 'Work Tasks' :
                   key === 'meeting' ? 'Meetings' :
                   key === 'study' ? 'Study Sessions' :
                   key === 'exercise' ? 'Exercise' :
                   key === 'family' ? 'Family Time' :
                   key === 'social' ? 'Social Events' :
                   key.charAt(0).toUpperCase() + key.slice(1)}
                </Label>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-md border-2 border-border shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <Input
                    id={`color-${key}`}
                    type="color"
                    value={color}
                    onChange={(e) => updateColorPreference(key as keyof ColorPreferences, e.target.value)}
                    className="w-16 h-8 p-1 border rounded-md cursor-pointer"
                  />
                  <Input
                    value={color}
                    onChange={(e) => updateColorPreference(key as keyof ColorPreferences, e.target.value)}
                    placeholder="#000000"
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Quick Actions</Label>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    const randomColors = ['#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E'];
                    const newPreferences = { ...profile.color_preferences };
                    Object.keys(newPreferences).forEach(key => {
                      newPreferences[key as keyof ColorPreferences] = randomColors[Math.floor(Math.random() * randomColors.length)];
                    });
                    setProfile(prev => prev ? ({ ...prev, color_preferences: newPreferences }) : prev);
                  }}
                >
                  Randomize
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    const defaultColors = {
                      task: '#3B82F6',
                      event: '#10B981',
                      personal: '#F59E0B',
                      prep: '#EF4444',
                      driving: '#8B5CF6',
                      deadline: '#F97316',
                      work: '#059669',
                      meeting: '#7C3AED',
                      study: '#DC2626',
                      exercise: '#EA580C',
                      family: '#0EA5E9',
                      social: '#EC4899',
                    };
                    setProfile(prev => prev ? ({ ...prev, color_preferences: defaultColors }) : prev);
                  }}
                >
                  Reset to Default
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Task Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryManager 
            categories={categories} 
            onCategoriesUpdated={fetchCategories} 
          />
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