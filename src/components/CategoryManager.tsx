import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  color_code: string;
  sort_order: number;
}

interface CategoryManagerProps {
  categories: Category[];
  onCategoriesUpdated: () => void;
}

export function CategoryManager({ categories, onCategoriesUpdated }: CategoryManagerProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setNewCategoryName('');
    setNewCategoryColor('#3B82F6');
    setEditingCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setLoading(true);
    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({
            name: newCategoryName,
            color_code: newCategoryColor,
          })
          .eq('id', editingCategory.id)
          .eq('user_id', user?.id);

        if (error) throw error;

        toast({
          title: "Category updated",
          description: "Category has been updated successfully.",
        });
      } else {
        // Create new category
        const { error } = await supabase
          .from('categories')
          .insert([{
            name: newCategoryName,
            color_code: newCategoryColor,
            user_id: user?.id,
            sort_order: categories.length,
          }]);

        if (error) throw error;

        toast({
          title: "Category created",
          description: "New category has been created successfully.",
        });
      }

      onCategoriesUpdated();
      resetForm();
      setOpen(false);
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: "Error",
        description: "Failed to save category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', user?.id);

      if (error) throw error;

      onCategoriesUpdated();
      toast({
        title: "Category deleted",
        description: "Category has been deleted. Tasks will be uncategorized.",
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category.",
        variant: "destructive",
      });
    }
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryColor(category.color_code);
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Task Categories
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">Category Name</Label>
                  <Input
                    id="category-name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter category name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category-color">Color</Label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-md border-2 border-border shadow-sm"
                      style={{ backgroundColor: newCategoryColor }}
                    />
                    <Input
                      id="category-color"
                      type="color"
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className="w-16 h-8 p-1 border rounded-md cursor-pointer"
                    />
                    <Input
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      placeholder="#000000"
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? "Saving..." : editingCategory ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
              <div 
                className="w-4 h-4 rounded-full flex-shrink-0" 
                style={{ backgroundColor: category.color_code }}
              />
              <span className="flex-1 font-medium">{category.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startEdit(category)}
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteCategory(category.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          
          {categories.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">
              No categories yet. Create your first category to organize tasks!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}