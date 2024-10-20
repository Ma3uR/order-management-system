import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const projects = await prisma.project.findMany()
    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ message: 'Error fetching projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, summary } = await request.json()
    
    let dummyUser = await prisma.user.upsert({
      where: { email: 'dummy@example.com' },
      update: {},
      create: {
        email: 'dummy@example.com',
        name: 'Dummy User'
      }
    })
    
    const project = await prisma.project.create({
      data: {
        name,
        description,
        summary,
        userId: dummyUser.id
      }
    })
    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ message: 'Error creating project' }, { status: 500 })
  }
}
