import { useState } from 'react';
import { MoreVertical, GripVertical, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  category_id: string | null;
  due_date: string | null;
  priority: string;
  completion_percentage: number;
  created_at: string;
  repeat_pattern: any;
  notes: string | null;
}

interface Category {
  id: string;
  name: string;
  color_code: string;
  sort_order: number;
}

interface TaskItemProps {
  task: Task;
  categories: Category[];
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
}

export function TaskItem({ 
  task, 
  categories, 
  onToggleComplete, 
  onEdit, 
  onDelete,
  onDragStart 
}: TaskItemProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diffX = currentX - startX;
    setSwipeX(Math.max(-100, Math.min(100, diffX)));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (swipeX > 50) {
      // Swipe right - mark complete
      onToggleComplete(task.id, !task.is_completed);
    } else if (swipeX < -50) {
      // Swipe left - show delete (or delete immediately)
      onDelete(task.id);
    }
    
    setSwipeX(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diffX = e.clientX - startX;
    setSwipeX(Math.max(-100, Math.min(100, diffX)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    
    if (swipeX > 50) {
      onToggleComplete(task.id, !task.is_completed);
    } else if (swipeX < -50) {
      onDelete(task.id);
    }
    
    setSwipeX(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        <div className="flex-1 bg-green-500 flex items-center justify-start pl-4">
          <span className="text-white font-medium">Complete</span>
        </div>
        <div className="flex-1 bg-red-500 flex items-center justify-end pr-4">
          <Trash2 className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Task content */}
      <div 
        className={cn(
          "relative bg-background flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-transform",
          isDragging && "cursor-grabbing"
        )}
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Drag handle */}
        <div 
          className="cursor-grab hover:cursor-grabbing text-muted-foreground hover:text-foreground"
          draggable
          onDragStart={(e) => onDragStart(e, task)}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <Checkbox
          checked={task.is_completed}
          onCheckedChange={(checked) => onToggleComplete(task.id, checked as boolean)}
        />
        
        <div className="flex-1">
          <p className={cn(
            "font-medium", 
            task.is_completed && "line-through text-muted-foreground"
          )}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}
          {task.completion_percentage > 0 && task.completion_percentage < 100 && (
            <div className="w-full bg-secondary rounded-full h-1 mt-1">
              <div 
                className="bg-primary h-1 rounded-full transition-all" 
                style={{ width: `${task.completion_percentage}%` }}
              />
            </div>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6"
          onClick={() => onEdit(task)}
        >
          <MoreVertical className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}