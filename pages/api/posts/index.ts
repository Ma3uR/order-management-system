import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const posts = await prisma.post.findMany({ include: { project: true } })
      res.status(200).json(posts)
    } catch (error) {
      console.error('Error fetching posts:', error)
      res.status(500).json({ message: 'Error fetching posts', error: error.message })
    }
  } else if (req.method === 'POST') {
    try {
      const { content, subject, platform, status, scheduledDate, projectId } = req.body
      const post = await prisma.post.create({
        data: { 
          content, 
          subject, 
          platform, 
          status, 
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null, 
          projectId 
        }
      })
      res.status(201).json(post)
    } catch (error) {
      console.error('Error creating post:', error)
      res.status(500).json({ message: 'Error creating post', error: error.message })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}
