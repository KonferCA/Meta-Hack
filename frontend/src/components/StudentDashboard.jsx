import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { FiBook, FiClock, FiTrendingUp, FiArrowRight, FiAward, FiBookOpen } from 'react-icons/fi'
import toast from 'react-hot-toast'

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
}

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
                const [enrolledResponse, availableResponse] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/courses/enrolled`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    }),
                    fetch(`${import.meta.env.VITE_API_URL}/courses/available`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    })
                ])
                
                if (!enrolledResponse.ok || !availableResponse.ok) {
                    throw new Error('Failed to fetch courses')
                }
                
                const [enrolledData, availableData] = await Promise.all([
                    enrolledResponse.json(),
                    availableResponse.json()
                ])
                
                setEnrolledCourses(enrolledData)
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
            <div className="w-16 h-16 relative">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
            </div>
        </div>
    )

    if (error) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="bg-red-50 text-red-500 p-6 rounded-xl shadow-lg max-w-md text-center">
                <div className="text-xl font-semibold mb-2">Error loading courses</div>
                <div className="text-red-600">{error}</div>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50">
            <div className="max-w-7xl mx-auto p-8">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-12"
                >
                    {/* welcome section */}
                    <motion.div variants={itemVariants} className="text-center mb-12">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">
                            Welcome back, {user?.username}!
                        </h1>
                        <p className="text-gray-600 text-lg">
                            Continue your learning journey where you left off
                        </p>
                    </motion.div>

                    {/* enrolled courses section */}
                    <motion.section variants={itemVariants} className="space-y-6">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                                <FiBook className="mr-2" />
                                My Courses
                            </h2>
                            <Link
                                to="/courses"
                                className="text-blue-600 hover:text-blue-700 flex items-center transition-colors"
                            >
                                View all
                                <FiArrowRight className="ml-1" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {enrolledCourses.map(course => (
                                <motion.div
                                    key={course.id}
                                    whileHover={{ y: -5 }}
                                    className="group relative"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
                                    <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden">
                                        <div className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm">
                                                    {course.category}
                                                </div>
                                                <div className="flex items-center text-gray-500 text-sm">
                                                    <FiClock className="mr-1" />
                                                    {course.estimated_hours}h
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-xl mb-2 text-gray-900">{course.title}</h3>
                                            <p className="text-gray-600 mb-6 line-clamp-2">{course.description}</p>
                                            
                                            <button 
                                                onClick={() => navigate({ to: `/course/${course.id}` })}
                                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 
                                                    hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 
                                                    rounded-xl font-medium transition-all duration-200 flex 
                                                    items-center justify-center group"
                                            >
                                                Continue Learning
                                                <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.section>

                    {/* available courses section */}
                    <motion.section variants={itemVariants} className="space-y-6">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                                <FiBookOpen className="mr-2" />
                                Available Courses
                            </h2>
                        </div>

                        {availableCourses.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                                <div className="text-gray-400 mb-4">
                                    <FiBook className="w-12 h-12 mx-auto" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    No courses available
                                </h3>
                                <p className="text-gray-500">
                                    Check back later for new courses
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {availableCourses.map(course => (
                                    <motion.div
                                        key={course.id}
                                        whileHover={{ y: -5 }}
                                        className="group relative"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
                                        <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden">
                                            <div className="p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-sm">
                                                        {course.difficulty}
                                                    </div>
                                                    <div className="flex items-center text-gray-500 text-sm">
                                                        <FiClock className="mr-1" />
                                                        {course.estimated_hours}h
                                                    </div>
                                                </div>
                                                <h3 className="font-bold text-xl mb-2 text-gray-900">{course.title}</h3>
                                                <p className="text-gray-600 mb-6 line-clamp-2">{course.description}</p>
                                                
                                                <button 
                                                    onClick={() => navigate({ 
                                                        to: '/courses/$courseId',
                                                        params: { courseId: course.id }
                                                    })}
                                                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 
                                                        hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 
                                                        rounded-xl font-medium transition-all duration-200 flex 
                                                        items-center justify-center group"
                                                >
                                                    View Course
                                                    <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.section>
                </motion.div>
            </div>
        </div>
    )
} 