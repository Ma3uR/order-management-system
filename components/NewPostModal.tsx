import { useState, useEffect } from "react"
import { Button } from "@/smm-system/components/ui/button"
import { Input } from "@/smm-system/components/ui/input"
import { Textarea } from "@/smm-system/components/ui/textarea"
import { Select } from "@/smm-system/components/ui/select"
import { PlusCircle } from "lucide-react"
import axios from 'axios'

interface Project {
  id: string;
  name: string;
}

export default function NewPostModal() {
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    platform: '',
    projectId: '',
    scheduledDate: ''
  })

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects')
      setProjects(response.data)
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post('/api/posts', { ...formData, status: 'draft' })
      setOpen(false)
      setFormData({ subject: '', content: '', platform: '', projectId: '', scheduledDate: '' })
      // You might want to refresh the posts list here
    } catch (error) {
      console.error('Error creating post:', error)
    }
  }

  return (
    <div>
      <Button onClick={() => setOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        New Post
      </Button>
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Post</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select name="projectId" value={formData.projectId} onChange={handleChange} required>
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </Select>
              <Input
                name="subject"
                placeholder="Subject for AI generation"
                value={formData.subject}
                onChange={handleChange}
                required
              />
              <Select name="platform" value={formData.platform} onChange={handleChange} required>
                <option value="">Select platform</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="twitter">Twitter</option>
                <option value="linkedin">LinkedIn</option>
              </Select>
              <Textarea
                name="content"
                placeholder="Post content"
                value={formData.content}
                onChange={handleChange}
                required
              />
              <Input
                type="datetime-local"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleChange}
              />
              <div className="flex justify-end mt-4">
                <Button type="submit">Create Post</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
