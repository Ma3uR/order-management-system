"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import axios from 'axios'

interface Project {
  id: string;
  name: string;
  description: string;
  summary: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects')
      setProjects(response.data)
    } catch (error) {
      console.error('Error fetching projects:', error)
      setError('Failed to fetch projects')
    }
  }

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
        setProjectName('')
        setDescription('')
        setSummary('')
        fetchProjects()
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
      <h1 className="text-3xl font-bold mb-6">Projects</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Project List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>{project.name}</TableCell>
                  <TableCell>{project.summary}</TableCell>
                  <TableCell>{project.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
