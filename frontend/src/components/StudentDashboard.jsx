import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'

export default function StudentDashboard() {
    const { user } = useAuth()
    const [courses, setCourses] = useState([])
    const [enrolledCourses, setEnrolledCourses] = useState([])

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

    const handleEnroll = async (courseId) => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/courses/${courseId}/enroll`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            )
            if (response.ok) {
                toast.success('Successfully enrolled!')
                // Refresh courses
                const updatedCourses = courses.filter(c => c.id !== courseId)
                setCourses(updatedCourses)
                setEnrolledCourses(prev => [...prev, courses.find(c => c.id === courseId)])
            }
        } catch (error) {
            toast.error('Failed to enroll in course')
        }
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-8">Student Dashboard</h1>
            
            <section className="mb-12">
                <h2 className="text-xl font-semibold mb-4">My Courses</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {enrolledCourses.map(course => (
                        <div key={course.id} className="border p-4 rounded shadow">
                            <h3 className="font-bold">{course.title}</h3>
                            <p className="text-gray-600">{course.description}</p>
                            <Link 
                                to="/course/$courseId"
                                params={{ courseId: course.id.toString() }}
                                className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded"
                            >
                                Continue Learning
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-xl font-semibold mb-4">Available Courses</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courses.map(course => (
                        <div key={course.id} className="border p-4 rounded shadow">
                            <h3 className="font-bold">{course.title}</h3>
                            <p className="text-gray-600">{course.description}</p>
                            <button
                                onClick={() => handleEnroll(course.id)}
                                className="mt-4 bg-green-500 text-white px-4 py-2 rounded"
                            >
                                Enroll
                            </button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
} 