import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { FiUpload, FiBook, FiPlus, FiArrowRight, FiUsers, FiClock } from 'react-icons/fi'
import toast from 'react-hot-toast'
import GenerationProgress from './GenerationProgress'

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

export default function ProfessorDashboard() {
    const { user } = useAuth()
    const [courses, setCourses] = useState([])
    const [isUploading, setIsUploading] = useState(false)
    const [showProgress, setShowProgress] = useState(false)
    const [progress, setProgress] = useState({
        details: { status: 'pending' },
        content: { status: 'pending' },
        quiz: { status: 'pending' }
    })
    const [newCourse, setNewCourse] = useState({
        title: '',
        description: '',
        content: null
    })
    const [newCourseId, setNewCourseId] = useState(null)

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/courses/teaching`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                })
                if (!response.ok) {
                    throw new Error('Failed to fetch courses')
                }
                const data = await response.json()
                setCourses(data)
            } catch (error) {
                console.error('Error fetching courses:', error)
                toast.error('Failed to fetch courses')
            }
        }
        fetchCourses()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsUploading(true)
        setShowProgress(true)
        
        try {
            const formData = new FormData()
            formData.append('title', newCourse.title)
            formData.append('description', newCourse.description)
            formData.append('content', newCourse.content)

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/courses/create`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                }
            )

            if (!response.ok) throw new Error('Failed to create course')

            const reader = response.body.getReader()
            const decoder = new TextDecoder()

            while (true) {
                const { value, done } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split('\n')

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(6))
                        
                        if (data.courseId) {
                            setNewCourseId(data.courseId)
                        }
                        
                        handleProgressUpdate(data)

                        if (data.type === 'quiz' && data.status === 'completed') {
                            setIsUploading(false)
                            setNewCourse({ title: '', description: '', content: null })
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error creating course:', error)
            toast.error('Failed to create course')
            setShowProgress(false)
            setIsUploading(false)
        }
    }

    const handleProgressUpdate = (data) => {
        setProgress(prev => ({
            ...prev,
            [data.type]: {
                status: data.status,
                stats: data.status === 'completed' ? {
                    ...data.stats,
                    pageCount: data.stats?.totalPages || 24,
                    currentSection: 'Course generation complete',
                    percentage: 100
                } : data.stats
            }
        }))
    }

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
                            Welcome, Professor {user?.username}!
                        </h1>
                        <p className="text-gray-600 text-lg">
                            Create and manage your courses
                        </p>
                    </motion.div>

                    {/* create course section - made more narrow */}
                    <motion.section variants={itemVariants}>
                        <div className="relative max-w-2xl mx-auto">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-20" />
                            <div className="relative bg-white rounded-2xl shadow-xl p-8">
                                <div className="flex items-center mb-8">
                                    <div className="p-3 bg-blue-100 rounded-xl">
                                        <FiPlus className="text-blue-600 w-6 h-6" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 ml-4">Create New Course</h2>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Course Title"
                                            value={newCourse.title}
                                            onChange={e => setNewCourse(prev => ({...prev, title: e.target.value}))}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 
                                                focus:ring-blue-500 focus:border-transparent transition-all"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <textarea
                                            placeholder="Course Description"
                                            value={newCourse.description}
                                            onChange={e => setNewCourse(prev => ({...prev, description: e.target.value}))}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 h-32 
                                                focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            required
                                        />
                                    </div>

                                    <motion.div
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                    >
                                        <input
                                            type="file"
                                            accept=".zip"
                                            onChange={e => setNewCourse(prev => ({...prev, content: e.target.files[0]}))}
                                            className="hidden"
                                            id="file-upload"
                                            required
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className="w-full flex items-center justify-center p-6 border-2 border-dashed 
                                                border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 
                                                transition-colors group"
                                        >
                                            <div className="flex flex-col items-center text-gray-600 group-hover:text-blue-500">
                                                <FiUpload className="w-8 h-8 mb-2" />
                                                <span className="text-sm">
                                                    {newCourse.content ? newCourse.content.name : 'Upload Course Content (.zip)'}
                                                </span>
                                            </div>
                                        </label>
                                    </motion.div>

                                    <motion.button
                                        type="submit"
                                        disabled={isUploading}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 
                                            hover:from-blue-700 hover:to-purple-700 text-white px-6 py-4 
                                            rounded-xl font-medium transition-all duration-200 flex 
                                            items-center justify-center group disabled:from-gray-400 
                                            disabled:to-gray-500 shadow-lg"
                                    >
                                        {isUploading ? (
                                            <span className="flex items-center">
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                    className="mr-2"
                                                >
                                                    ⚡
                                                </motion.div>
                                                Creating Course...
                                            </span>
                                        ) : (
                                            <span className="flex items-center">
                                                Create Course
                                                <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                                            </span>
                                        )}
                                    </motion.button>
                                </form>
                            </div>
                        </div>
                    </motion.section>

                    {/* courses section - full width */}
                    <motion.section variants={itemVariants} className="space-y-6">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                                <FiBook className="mr-2" />
                                My Courses
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {courses.map(course => (
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
                                                    {course.category || 'Course'}
                                                </div>
                                                <div className="flex items-center space-x-4">
                                                    <div className="flex items-center text-gray-500 text-sm">
                                                        <FiUsers className="mr-1" />
                                                        {course.studentCount || 0}
                                                    </div>
                                                    <div className="flex items-center text-gray-500 text-sm">
                                                        <FiClock className="mr-1" />
                                                        {course.estimated_hours || 0}h
                                                    </div>
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-xl mb-2 text-gray-900">{course.title}</h3>
                                            <p className="text-gray-600 mb-6 line-clamp-2">{course.description}</p>
                                            
                                            <Link 
                                                to="/course/$courseId/manage"
                                                params={{ courseId: course.id.toString() }}
                                                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 
                                                    hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 
                                                    rounded-xl font-medium transition-all duration-200 flex 
                                                    items-center justify-center group"
                                            >
                                                Manage Course
                                                <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                                            </Link>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.section>
                </motion.div>
            </div>

            {showProgress && (
                <GenerationProgress 
                    progress={progress}
                    courseId={newCourseId}
                />
            )}
        </div>
    )
} 