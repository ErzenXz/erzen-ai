'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProject, updateProject, deleteProject } from '@/lib/project-service';
import { Project } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface ProjectPageParams {
  params: {
    projectId: string;
  };
}

export default function ProjectPage({ params }: ProjectPageParams) {
  const { projectId } = params;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setIsLoading(true);
        const fetchedProject = await getProject(projectId);
        setProject(fetchedProject);
        setName(fetchedProject.name);
        setDescription(fetchedProject.description || '');
      } catch (err) {
        setError('Failed to fetch project.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await updateProject(projectId, { name, description });
      router.push('/projects');
    } catch (err) {
      setError('Failed to update project.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      setIsDeleting(true);
      setError(null);
      try {
        await deleteProject(projectId);
        router.push('/projects');
      } catch (err) {
        setError('Failed to delete project.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (isLoading) return <p>Loading project...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!project) return <p>Project not found.</p>;

  return (
     <div className="container mx-auto p-4 flex justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Project</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="name">Project Name</label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="description">Description (Optional)</label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-red-500 mt-4">{error}</p>}

            <div className="flex justify-between items-center mt-6">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
              <div className="flex gap-2">
                 <Button variant="ghost" asChild>
                  <Link href="/projects">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 