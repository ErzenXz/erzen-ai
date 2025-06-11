import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Params {
  params: { projectId: string };
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    const { projectId } = params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!projectId) {
      return new NextResponse("Project ID is required", { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      return new NextResponse("Project not found", { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("[PROJECT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    const { projectId } = params;
    const { name, description } = await request.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!projectId) {
      return new NextResponse("Project ID is required", { status: 400 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const project = await prisma.project.update({
      where: {
        id: projectId,
        userId,
      },
      data: {
        name,
        description,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("[PROJECT_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    const { projectId } = params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!projectId) {
      return new NextResponse("Project ID is required", { status: 400 });
    }

    await prisma.project.delete({
      where: {
        id: projectId,
        userId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[PROJECT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
