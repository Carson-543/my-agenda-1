import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, MoreVertical, CheckSquare } from 'lucide-react';
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
}

interface Category {
  id: string;
  name: string;
  color_code: string;
  sort_order: number;
}

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchCategories();
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
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

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            title: newTaskTitle,
            user_id: user?.id,
            is_completed: false,
            completion_percentage: 0,
            priority: 'medium',
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setTasks([data, ...tasks]);
      setNewTaskTitle('');
      toast({
        title: "Task added",
        description: "Your new task has been created",
      });
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: "Error",
        description: "Failed to add task",
        variant: "destructive",
      });
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          is_completed: completed,
          completion_percentage: completed ? 100 : 0 
        })
        .eq('id', taskId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, is_completed: completed, completion_percentage: completed ? 100 : 0 }
          : task
      ));
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const getCategoryById = (categoryId: string | null) => {
    return categories.find(cat => cat.id === categoryId);
  };

  const groupedTasks = categories.reduce((acc, category) => {
    acc[category.name] = tasks.filter(task => task.category_id === category.id);
    return acc;
  }, {} as Record<string, Task[]>);

  // Add uncategorized tasks
  const uncategorizedTasks = tasks.filter(task => !task.category_id);
  if (uncategorizedTasks.length > 0) {
    groupedTasks['Uncategorized'] = uncategorizedTasks;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Add Task */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a new task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              className="flex-1"
            />
            <Button onClick={addTask} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Task Lists by Category */}
      {Object.entries(groupedTasks).map(([categoryName, categoryTasks]) => {
        const category = categories.find(cat => cat.name === categoryName);
        const colorClass = category ? `border-l-4` : '';
        
        return (
          <Card key={categoryName} className={colorClass}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {category && (
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color_code }}
                    />
                  )}
                  {categoryName}
                </span>
                <span className="text-sm text-muted-foreground">
                  {categoryTasks.filter(t => !t.is_completed).length} active
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {categoryTasks.length === 0 ? (
                <p className="text-muted-foreground text-sm">No tasks yet</p>
              ) : (
                categoryTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
                    <Checkbox
                      checked={task.is_completed}
                      onCheckedChange={(checked) => toggleTask(task.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <p className={`font-medium ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
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
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
          <p className="text-muted-foreground">Add your first task to get started!</p>
        </div>
      )}
    </div>
  );
};

export default Tasks;