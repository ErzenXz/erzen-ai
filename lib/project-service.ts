import axios from "axios";
import { Project } from "@prisma/client";

const API_URL = "/api/projects";

export const getProjects = async (): Promise<Project[]> => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const createProject = async (project: {
  name: string;
  description?: string;
}): Promise<Project> => {
  const response = await axios.post(API_URL, project);
  return response.data;
};

export const getProject = async (projectId: string): Promise<Project> => {
  const response = await axios.get(`${API_URL}/${projectId}`);
  return response.data;
};

export const updateProject = async (
  projectId: string,
  project: { name: string; description?: string }
): Promise<Project> => {
  const response = await axios.patch(`${API_URL}/${projectId}`, project);
  return response.data;
};

export const deleteProject = async (projectId: string): Promise<void> => {
  await axios.delete(`${API_URL}/${projectId}`);
};
