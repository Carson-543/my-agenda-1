import { Link, useLocation } from 'react-router-dom';
import { CheckSquare, Calendar, Clock, Timer, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const BottomNavigation = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/month', icon: Calendar, label: 'Month' },
    { path: '/timeline', icon: Clock, label: 'Timeline' },
    { path: '/pomodoro', icon: Timer, label: 'Focus' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="flex justify-around items-center py-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-colors",
                "min-w-[60px] h-12",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;