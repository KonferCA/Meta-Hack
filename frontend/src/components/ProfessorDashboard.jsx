import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { FiUpload, FiBook, FiPlus } from 'react-icons/fi'
import GenerationProgress from './GenerationProgress'

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
                        
                        setProgress(prev => ({
                            ...prev,
                            [data.type]: {
                                status: data.status,
                                stats: data.stats
                            }
                        }))

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

    // animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    }

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8"
        >
            <motion.h1 
                initial={{ x: -20 }}
                animate={{ x: 0 }}
                className="text-xl font-bold mb-12 text-gray-800 border-b pb-4 text-center"
            >
                Professor Dashboard
            </motion.h1>
            
            <motion.section 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="mb-16"
            >
                <motion.div 
                    variants={itemVariants}
                    className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto"
                >
                    <div className="flex items-center mb-6">
                        <FiPlus className="text-blue-500 text-2xl mr-2" />
                        <h2 className="text-2xl font-semibold text-gray-800">Create New Course</h2>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="group">
                            <input
                                type="text"
                                placeholder="Course Title"
                                value={newCourse.title}
                                onChange={e => setNewCourse(prev => ({...prev, title: e.target.value}))}
                                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                required
                            />
                        </div>
                        <div className="group">
                            <textarea
                                placeholder="Course Description"
                                value={newCourse.description}
                                onChange={e => setNewCourse(prev => ({...prev, description: e.target.value}))}
                                className="w-full p-3 border border-gray-200 rounded-lg h-32 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                required
                            />
                        </div>
                        <motion.div
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className="relative"
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
                                className="w-full flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
                            >
                                <FiUpload className="mr-2" />
                                {newCourse.content ? newCourse.content.name : 'Upload Course Content (.zip)'}
                            </label>
                        </motion.div>
                        <motion.button
                            type="submit"
                            disabled={isUploading}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-lg font-medium shadow-lg transition-all disabled:from-gray-400 disabled:to-gray-500"
                        >
                            {isUploading ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="inline-block"
                                >
                                    ⚡
                                </motion.div>
                            ) : 'Create Course'}
                        </motion.button>
                    </form>
                </motion.div>
            </motion.section>

            <motion.section
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="mt-8"
            >
                <div className="flex items-center mb-8">
                    <FiBook className="text-blue-500 text-2xl mr-2" />
                    <h2 className="text-2xl font-semibold text-gray-800">My Courses</h2>
                </div>
                <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    variants={containerVariants}
                >
                    {courses.map(course => (
                        <motion.div
                            key={course.id}
                            variants={itemVariants}
                            whileHover={{ y: -3, scale: 1.01 }}
                            className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all"
                        >
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{course.title}</h3>
                            <p className="text-gray-600 mb-4">{course.description}</p>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Link 
                                    to="/course/$courseId/manage"
                                    params={{ courseId: course.id.toString() }}
                                    className="block text-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all hover:text-white"
                                >
                                    Manage Course
                                </Link>
                            </motion.div>
                        </motion.div>
                    ))}
                </motion.div>
            </motion.section>

            {showProgress && (
                <GenerationProgress 
                    progress={progress}
                    courseId={newCourseId}
                />
            )}
        </motion.div>
    )
} 