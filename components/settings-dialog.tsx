'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Trash2, Edit2, Plus } from 'lucide-react';
import { UserInstruction, ChatMemory } from '@/lib/types';
import {
  fetchMemory,
  deleteAllMemory,
  fetchInstructions,
  addInstruction,
  updateInstruction,
  deleteInstruction,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function SettingsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [memory, setMemory] = useState<ChatMemory[]>([]);
  const [instructions, setInstructions] = useState<UserInstruction[]>([]);
  const [newInstruction, setNewInstruction] = useState('');
  const [editingInstruction, setEditingInstruction] = useState<{ id: string; job: string } | null>(
    null
  );
  const [isDeleteMemoryDialogOpen, setIsDeleteMemoryDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [memoryData, instructionsData] = await Promise.all([
        fetchMemory(),
        fetchInstructions(),
      ]);
      setMemory(memoryData);
      setInstructions(instructionsData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load settings data',
        variant: 'destructive',
      });
    }
  };

  const handleAddInstruction = async () => {
    if (newInstruction.length < 30 || newInstruction.length > 200) {
      toast({
        title: 'Invalid instruction',
        description: 'Instruction must be between 30 and 200 characters',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addInstruction(newInstruction);
      setNewInstruction('');
      await loadData();
      toast({
        title: 'Success',
        description: 'Instruction added successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add instruction',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateInstruction = async () => {
    if (!editingInstruction) return;

    if (editingInstruction.job.length < 30 || editingInstruction.job.length > 200) {
      toast({
        title: 'Invalid instruction',
        description: 'Instruction must be between 30 and 200 characters',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateInstruction(editingInstruction.id, editingInstruction.job);
      setEditingInstruction(null);
      await loadData();
      toast({
        title: 'Success',
        description: 'Instruction updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update instruction',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteInstruction = async (id: string) => {
    try {
      await deleteInstruction(id);
      await loadData();
      toast({
        title: 'Success',
        description: 'Instruction deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete instruction',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAllMemory = async () => {
    try {
      await deleteAllMemory();
      setMemory([]);
      setIsDeleteMemoryDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Memory cleared successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear memory',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="flex-shrink-0" title="Settings">
            <Settings className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Memory</h3>
              <div className="space-y-4">
                <ScrollArea className="h-[200px] rounded-md border p-4">
                  {memory.map((item) => (
                    <div key={item.id} className="p-4 bg-muted rounded-lg mb-2">
                      <div className="font-medium">{item.key}</div>
                      <div className="text-sm text-muted-foreground">{item.value}</div>
                    </div>
                  ))}
                </ScrollArea>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteMemoryDialogOpen(true)}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Memory
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Instructions</h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newInstruction}
                    onChange={(e) => setNewInstruction(e.target.value)}
                    placeholder="Add new instruction (30-200 characters)"
                  />
                  <Button onClick={handleAddInstruction}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>

                <ScrollArea className="h-[200px] rounded-md border p-4">
                  {instructions.map((instruction) => (
                    <div key={instruction.id} className="p-4 bg-muted rounded-lg mb-2">
                      {editingInstruction?.id === instruction.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editingInstruction.job}
                            onChange={(e) =>
                              setEditingInstruction({ ...editingInstruction, job: e.target.value })
                            }
                          />
                          <Button onClick={handleUpdateInstruction}>Save</Button>
                          <Button variant="ghost" onClick={() => setEditingInstruction(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">{instruction.job}</div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setEditingInstruction({ id: instruction.id, job: instruction.job })
                              }
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteInstruction(instruction.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteMemoryDialogOpen}
        onOpenChange={setIsDeleteMemoryDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Memory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all memory? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllMemory}>
              Clear Memory
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}