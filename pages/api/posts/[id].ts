import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (req.method === 'PUT') {
    const { content, subject, platform, status, scheduledDate, projectId } = req.body
    const post = await prisma.post.update({
      where: { id: String(id) },
      data: { content, subject, platform, status, scheduledDate, projectId }
    })
    res.status(200).json(post)
  } else if (req.method === 'DELETE') {
    await prisma.post.delete({ where: { id: String(id) } })
    res.status(204).end()
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}
