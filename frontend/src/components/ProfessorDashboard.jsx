import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'

export default function ProfessorDashboard() {
    const { user } = useAuth()
    const [courses, setCourses] = useState([])
    const [isUploading, setIsUploading] = useState(false)
    const [newCourse, setNewCourse] = useState({
        title: '',
        description: '',
        content: null
    })

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/courses`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                })
                if (response.ok) {
                    const data = await response.json()
                    setCourses(data)
                }
            } catch (error) {
                toast.error('Failed to fetch courses')
            }
        }
        fetchCourses()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsUploading(true)
        
        try {
            const formData = new FormData()
            formData.append('title', newCourse.title)
            formData.append('description', newCourse.description)
            formData.append('content', newCourse.content)

            const response = await fetch(`${import.meta.env.VITE_API_URL}/courses`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            })

            if (response.ok) {
                const data = await response.json()
                setCourses(prev => [...prev, data])
                setNewCourse({ title: '', description: '', content: null })
                toast.success('Course created successfully!')
            }
        } catch (error) {
            toast.error('Failed to create course')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-8">Professor Dashboard</h1>
            
            <section className="mb-12">
                <h2 className="text-xl font-semibold mb-4">Create New Course</h2>
                <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
                    <input
                        type="text"
                        placeholder="Course Title"
                        value={newCourse.title}
                        onChange={e => setNewCourse(prev => ({...prev, title: e.target.value}))}
                        className="w-full p-2 border rounded"
                        required
                    />
                    <textarea
                        placeholder="Course Description"
                        value={newCourse.description}
                        onChange={e => setNewCourse(prev => ({...prev, description: e.target.value}))}
                        className="w-full p-2 border rounded h-32"
                        required
                    />
                    <input
                        type="file"
                        accept=".zip"
                        onChange={e => setNewCourse(prev => ({...prev, content: e.target.files[0]}))}
                        className="w-full"
                        required
                    />
                    <button
                        type="submit"
                        disabled={isUploading}
                        className="w-full bg-blue-500 text-white p-2 rounded disabled:bg-gray-400"
                    >
                        {isUploading ? 'Creating...' : 'Create Course'}
                    </button>
                </form>
            </section>

            <section>
                <h2 className="text-xl font-semibold mb-4">My Courses</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courses.map(course => (
                        <div key={course.id} className="border p-4 rounded shadow">
                            <h3 className="font-bold">{course.title}</h3>
                            <p className="text-gray-600">{course.description}</p>
                            <Link 
                                to="/course/$courseId/manage"
                                params={{ courseId: course.id.toString() }}
                                className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded"
                            >
                                Manage Course
                            </Link>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
} 