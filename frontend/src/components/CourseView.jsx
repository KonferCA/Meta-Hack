import { useState, useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function CourseView() {
    const { courseId } = useParams({ from: '/course/$courseId' })
    const { user } = useAuth()
    const [course, setCourse] = useState(null)
    const [sections, setSections] = useState([])
    const [currentSection, setCurrentSection] = useState(null)
    const [progress, setProgress] = useState({})

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                // fetch course details
                const courseRes = await fetch(
                    `${import.meta.env.VITE_API_URL}/courses/${courseId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    }
                )
                if (courseRes.ok) {
                    const courseData = await courseRes.json()
                    setCourse(courseData)
                    setSections(courseData.sections)
                }

                // fetch student progress
                const progressRes = await fetch(
                    `${import.meta.env.VITE_API_URL}/courses/${courseId}/progress`,
                    {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    }
                )
                if (progressRes.ok) {
                    const progressData = await progressRes.json()
                    setProgress(progressData)
                }
            } catch (error) {
                toast.error('Failed to load course')
            }
        }
        fetchCourse()
    }, [courseId])

    const handleSectionClick = (section) => {
        setCurrentSection(section)
    }

    const handleQuizStart = async (sectionId) => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/courses/${courseId}/sections/${sectionId}/quiz`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            )
            if (response.ok) {
                const quiz = await response.json()
                // TODO: Implement quiz modal/page
            }
        } catch (error) {
            toast.error('Failed to load quiz')
        }
    }

    if (!course) return <div>Loading...</div>

    return (
        <div className="flex min-h-screen">
            {/* sidebar */}
            <div className="w-64 bg-gray-100 p-4 border-r">
                <h2 className="text-xl font-bold mb-4">{course.title}</h2>
                <div className="space-y-2">
                    {sections.map(section => (
                        <div 
                            key={section.id}
                            onClick={() => handleSectionClick(section)}
                            className={`
                                p-2 rounded cursor-pointer
                                ${currentSection?.id === section.id ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}
                                ${progress[section.id]?.completed ? 'border-l-4 border-green-500' : ''}
                            `}
                        >
                            {section.title}
                        </div>
                    ))}
                </div>
            </div>

            {/* main content */}
            <div className="flex-1 p-8">
                {currentSection ? (
                    <div>
                        <h3 className="text-2xl font-bold mb-4">{currentSection.title}</h3>
                        <div className="mb-8">
                            <iframe
                                src={currentSection.content_url}
                                className="w-full h-[800px]"
                                title={currentSection.title}
                            />
                        </div>
                        <button
                            onClick={() => handleQuizStart(currentSection.id)}
                            className="bg-green-500 text-white px-4 py-2 rounded"
                        >
                            Take Quiz
                        </button>
                    </div>
                ) : (
                    <div className="text-center text-gray-500">
                        Select a section to begin
                    </div>
                )}
            </div>
        </div>
    )
} 