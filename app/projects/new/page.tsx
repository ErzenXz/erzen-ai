'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject } from '@/lib/project-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function NewProjectPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await createProject({ name, description });
      router.push('/projects');
      // Revalidate/refresh the projects list if necessary, Next.js App Router might handle this
    } catch (err) {
      setError('Failed to create project.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 flex justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="name">Project Name</label>
                <Input
                  id="name"
                  placeholder="My Awesome Project"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="description">Description (Optional)</label>
                <Textarea
                  id="description"
                  placeholder="A brief description of the project."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-red-500 mt-4">{error}</p>}

            <div className="flex justify-end gap-2 mt-6">
               <Button variant="ghost" asChild>
                <Link href="/projects">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 