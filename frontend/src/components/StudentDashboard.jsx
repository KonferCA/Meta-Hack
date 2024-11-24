import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link, useNavigate } from '@tanstack/react-router'
import toast from 'react-hot-toast'

export default function StudentDashboard() {
    const { user } = useAuth()
    const [enrolledCourses, setEnrolledCourses] = useState([])
    const [availableCourses, setAvailableCourses] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        const fetchCourses = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const enrolledResponse = await fetch(
                    `${import.meta.env.VITE_API_URL}/courses/enrolled`,
                    {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    }
                )
                
                if (!enrolledResponse.ok) {
                    throw new Error('Failed to fetch enrolled courses')
                }
                
                const enrolledData = await enrolledResponse.json()
                setEnrolledCourses(enrolledData)
                
                const availableResponse = await fetch(
                    `${import.meta.env.VITE_API_URL}/courses/available`,
                    {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    }
                )
                
                if (!availableResponse.ok) {
                    throw new Error('Failed to fetch available courses')
                }
                
                const availableData = await availableResponse.json()
                setAvailableCourses(availableData)
                
            } catch (error) {
                console.error('Error fetching courses:', error)
                setError(error.message)
                toast.error(error.message)
            } finally {
                setIsLoading(false)
            }
        }
        
        fetchCourses()
    }, [])

    if (isLoading) return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    )

    if (error) return (
        <div className="text-center text-red-500 p-4">
            Error loading courses: {error}
        </div>
    )

    return (
        <div className="container mx-auto p-4">
            <section className="mb-12">
                <h2 className="text-2xl font-bold mb-6">My Courses</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {enrolledCourses.map(course => (
                        <div key={course.id} 
                            className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                            <div className="p-6">
                                <h3 className="font-bold text-xl mb-2">{course.title}</h3>
                                <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                                <button 
                                    onClick={() => navigate({ to: `/course/${course.id}` })}
                                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg 
                                        hover:bg-blue-700 transition-colors"
                                >
                                    Continue Learning
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-bold mb-6">Available Courses</h2>
                {availableCourses.length === 0 ? (
                    <div className="text-center text-gray-500 p-8">
                        No courses available at the moment.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {availableCourses.map(course => (
                            <div key={course.id} 
                                className="bg-white rounded-xl shadow-md overflow-hidden 
                                    hover:shadow-lg transition-shadow">
                                <div className="p-6">
                                    <h3 className="font-bold text-xl mb-2">{course.title}</h3>
                                    <p className="text-gray-600 mb-4 line-clamp-2">
                                        {course.description}
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                        <span>{course.difficulty}</span>
                                        <span>•</span>
                                        <span>{course.estimated_hours} hours</span>
                                    </div>
                                    <button 
                                        onClick={() => navigate({ to: '/courses/$courseId', params: { courseId: course.id } })}
                                        className="w-full bg-white text-blue-600 px-4 py-2 
                                            rounded-lg border-2 border-blue-600 
                                            hover:bg-blue-50 transition-colors"
                                    >
                                        View Course
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
} 