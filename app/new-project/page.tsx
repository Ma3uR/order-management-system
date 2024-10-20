"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/smm-system/components/ui/button"
import { Input } from "@/smm-system/components/ui/input"
import { Textarea } from "@/smm-system/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/smm-system/components/ui/card"
import axios from 'axios'

export default function NewProject() {
  const router = useRouter()
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await axios.post('/api/projects', {
        name: projectName,
        description,
        summary
      })

      if (response.status === 201) {
        console.log('Project created successfully:', response.data)
        router.push('/dashboard')
      } else {
        setError(`Failed to create project. Status: ${response.status}`)
      }
    } catch (error) {
      console.error('Error creating project:', error)
      setError(`An error occurred while creating the project: ${error.response?.data?.error || error.message}`)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Create New Project</h1>
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">
                Project Name
              </label>
              <Input
                id="projectName"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="summary" className="block text-sm font-medium text-gray-700">
                Summary
              </label>
              <Input
                id="summary"
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            {error && <p className="text-red-500">{error}</p>}
            <Button type="submit">Create Project</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
