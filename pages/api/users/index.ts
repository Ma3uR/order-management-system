import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const users = await prisma.user.findMany()
      res.status(200).json(users)
    } catch (error) {
      console.error('Error fetching users:', error)
      res.status(500).json({ message: 'Error fetching users', error: error.message })
    }
  } else if (req.method === 'POST') {
    try {
      const { name, email, password } = req.body
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } })
      if (existingUser) {
        return res.status(200).json(existingUser)
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword
        }
      })
      
      res.status(201).json({ id: user.id, name: user.name, email: user.email })
    } catch (error) {
      console.error('Error creating user:', error)
      res.status(500).json({ message: 'Error creating user', error: error.message })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}
