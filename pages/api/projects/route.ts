import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const projects = await prisma.project.findMany()
      res.status(200).json(projects)
    } catch (error) {
      console.error('Error fetching projects:', error)
      res.status(500).json({ message: 'Error fetching projects', error: error.message })
    }
  } else if (req.method === 'POST') {
    try {
      const { name, description, summary } = req.body
      console.log('Received data:', { name, description, summary })
    
      let dummyUser
      try {
        dummyUser = await prisma.user.upsert({
          where: { email: 'dummy@example.com' },
          update: {},
          create: {
            email: 'dummy@example.com',
            name: 'Dummy User'
          }
        })
      } catch (userError: unknown) {
        console.error('Error creating/finding dummy user:', userError)
        if (userError instanceof Error) {
          return res.status(500).json({ message: 'Error creating/finding dummy user', error: userError.message })
        } else {
          return res.status(500).json({ message: 'Error creating/finding dummy user', error: 'Unknown error occurred' })
        }
      }
      
      const project = await prisma.project.create({
        data: {
          name,
          description,
          summary,
          userId: dummyUser.id
        }
      })
      res.status(201).json(project)
    } catch (error) {
      console.error('Error creating project:', error)
      res.status(500).json({ message: 'Error creating project', error: error.message })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}
