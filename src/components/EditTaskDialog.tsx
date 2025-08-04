import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

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
}

interface Subtask {
  id: string;
  title: string;
  is_completed: boolean;
}

interface EditTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
  categories: Category[];
}

export function EditTaskDialog({ task, open, onOpenChange, onTaskUpdated, categories }: EditTaskDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState('daily');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task && open) {
      setTitle(task.title);
      setDescription(task.description || '');
      setNotes(task.notes || '');
      setCategoryId(task.category_id);
      setPriority(task.priority);
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setIsRecurring(!!task.repeat_pattern && Object.keys(task.repeat_pattern).length > 0);
      setRecurringType(task.repeat_pattern?.type || 'daily');

      fetchSubtasks();
    }
  }, [task, open]);

  const fetchSubtasks = async () => {
    if (!task) return;
    
    try {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', task.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setSubtasks(data || []);
    } catch (error) {
      console.error('Error fetching subtasks:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !title.trim()) return;

    setLoading(true);
    try {
      const updateData: any = {
        title,
        description: description || null,
        notes: notes || null,
        category_id: categoryId,
        priority,
        due_date: dueDate?.toISOString() || null,
        repeat_pattern: isRecurring ? { type: recurringType } : {},
      };

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', task.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Task updated",
        description: "Your task has been updated successfully.",
      });

      onTaskUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addSubtask = async () => {
    if (!newSubtaskTitle.trim() || !task) return;

    try {
      const { data, error } = await supabase
        .from('subtasks')
        .insert([
          {
            title: newSubtaskTitle,
            task_id: task.id,
            user_id: user?.id,
            is_completed: false,
            sort_order: subtasks.length,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setSubtasks([...subtasks, data]);
      setNewSubtaskTitle('');
    } catch (error) {
      console.error('Error adding subtask:', error);
      toast({
        title: "Error",
        description: "Failed to add subtask.",
        variant: "destructive",
      });
    }
  };

  const toggleSubtask = async (subtaskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .update({ is_completed: completed })
        .eq('id', subtaskId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setSubtasks(subtasks.map(subtask => 
        subtask.id === subtaskId ? { ...subtask, is_completed: completed } : subtask
      ));
    } catch (error) {
      console.error('Error updating subtask:', error);
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setSubtasks(subtasks.filter(subtask => subtask.id !== subtaskId));
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId || "none"} onValueChange={(value) => setCategoryId(value === "none" ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color_code }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Set due date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>


          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
              />
              <Label htmlFor="recurring">Recurring task</Label>
            </div>

            {isRecurring && (
              <Select value={recurringType} onValueChange={setRecurringType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Subtasks</Label>
            <div className="space-y-2">
              {subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={subtask.is_completed}
                    onCheckedChange={(checked) => toggleSubtask(subtask.id, checked as boolean)}
                  />
                  <span className={cn(
                    "flex-1 text-sm",
                    subtask.is_completed && "line-through text-muted-foreground"
                  )}>
                    {subtask.title}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSubtask(subtask.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Add subtask..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                  className="flex-1"
                />
                <Button type="button" onClick={addSubtask} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Updating..." : "Update Task"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}