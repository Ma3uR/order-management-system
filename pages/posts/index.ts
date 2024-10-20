import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const posts = await prisma.post.findMany()
      res.status(200).json(posts)
    } catch (error) {
      res.status(500).json({ error: 'Error fetching posts' })
    }
  } else if (req.method === 'POST') {
    try {
      const { content, imageUrl, platform, status, scheduledDate, projectId } = req.body
      const post = await prisma.post.create({
        data: { content, imageUrl, platform, status, scheduledDate, projectId },
      })
      res.status(201).json(post)
    } catch (error) {
      res.status(500).json({ error: 'Error creating post' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
