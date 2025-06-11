'use client';

import { useEffect, useState } from 'react';
import { Project } from '@prisma/client';
import { getProjects } from '@/lib/project-service';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const fetchedProjects = await getProjects();
        setProjects(fetchedProjects);
      } catch (err) {
        setError('Failed to fetch projects.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button asChild>
          <Link href="/projects/new">New Project</Link>
        </Button>
      </div>

      {isLoading && <p>Loading projects...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="border rounded-lg p-4">
              <h2 className="text-xl font-semibold">{project.name}</h2>
              <p className="text-gray-600">{project.description}</p>
              <div className="mt-4 flex justify-end gap-2">
                 <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${project.id}`}>View</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!isLoading && !error && projects.length === 0 && (
        <div className="text-center py-10 border rounded-lg">
          <h2 className="text-xl font-semibold">No Projects Found</h2>
          <p className="text-gray-500 mt-2">Get started by creating a new project.</p>
          <Button asChild className="mt-4">
             <Link href="/projects/new">Create Project</Link>
          </Button>
        </div>
      )}
    </div>
  );
} 