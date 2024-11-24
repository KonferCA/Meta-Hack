import { useState, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../contexts/AuthContext'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'

export default function CourseLanding() {
    const { courseId } = useParams({ from: '/courses/$courseId' })
    const navigate = useNavigate()
    const { user } = useAuth()
    const [course, setCourse] = useState(null)
    const [isEnrolling, setIsEnrolling] = useState(false)

    useEffect(() => {
        const fetchCourse = async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/courses/${courseId}/details`)
            if (response.ok) {
                setCourse(await response.json())
            }
        }
        fetchCourse()
    }, [courseId])

    const handleEnroll = async () => {
        setIsEnrolling(true)
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/courses/${courseId}/enroll`,
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }
            )
            if (response.ok) {
                toast.success('Successfully enrolled!')
                navigate({ to: `/course/${courseId}` })
            }
        } catch (error) {
            toast.error('Failed to enroll')
        } finally {
            setIsEnrolling(false)
        }
    }

    if (!course) return <div>Loading...</div>

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <div className="max-w-6xl mx-auto px-4 py-16">
                    <h1 className="text-5xl font-bold mb-4">{course.title}</h1>
                    <div className="flex items-center gap-4 text-blue-100 mb-8">
                        <span>By Prof. {course.professor_name}</span>
                        <span>•</span>
                        <span>{course.difficulty}</span>
                        <span>•</span>
                        <span>{course.estimated_hours} hours</span>
                    </div>
                    <button
                        onClick={handleEnroll}
                        disabled={isEnrolling}
                        className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold
                            hover:bg-blue-50 transition-colors disabled:bg-gray-200"
                    >
                        {isEnrolling ? 'Enrolling...' : 'Enroll Now'}
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="max-w-6xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-xl shadow-md p-8">
                            <h2 className="text-2xl font-semibold mb-4">About This Course</h2>
                            <div className="prose max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {course.description}
                                </ReactMarkdown>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-md p-8">
                            <h2 className="text-2xl font-semibold mb-6">What You'll Learn</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {course.learning_outcomes.map((outcome, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 
                                            text-blue-600 flex items-center justify-center">✓</div>
                                        <span>{outcome}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-md p-8">
                            <h2 className="text-2xl font-semibold mb-6">Course Highlights</h2>
                            <div className="grid gap-4">
                                {course.course_highlights.map((highlight, i) => (
                                    <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                        <span className="text-blue-600">•</span>
                                        {highlight}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-md p-6 sticky top-6">
                            <div className="space-y-4">
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-gray-600">Difficulty</span>
                                    <span className="font-medium">{course.difficulty}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-gray-600">Duration</span>
                                    <span className="font-medium">{course.estimated_hours} hours</span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-gray-600">Prerequisites</span>
                                    <span className="font-medium">
                                        {course.prerequisites.length ? 
                                            course.prerequisites.join(', ') : 
                                            'None'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-md p-6">
                            <h3 className="text-lg font-semibold mb-4">Skills You'll Gain</h3>
                            <div className="flex flex-wrap gap-2">
                                {course.skills_gained.map((skill, i) => (
                                    <span key={i} className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 