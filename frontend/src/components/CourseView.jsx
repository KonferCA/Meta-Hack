import { useState, useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

export default function CourseView() {
    const { courseId } = useParams({ from: '/course/$courseId' })
    const { user } = useAuth()
    const [course, setCourse] = useState(null)
    const [sections, setSections] = useState([])
    const [currentSection, setCurrentSection] = useState(null)
    const [progress, setProgress] = useState({})
    const [currentPage, setCurrentPage] = useState(0)
    const PAGES_PER_VIEW = 1  // show one page at a time

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

    // pagination controls
    const handleNextPage = () => {
        if (currentSection && currentPage < currentSection.pages.length - 1) {
            setCurrentPage(prev => prev + 1)
        }
    }

    const handlePrevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(prev => prev - 1)
        }
    }

    // reset current page when changing sections
    const handleSectionClick = (section) => {
        setCurrentSection(section)
        setCurrentPage(0)
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
            {/* sidebar with section navigation */}
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

            {/* main content area with pagination */}
            <div className="flex-1 p-8">
                {currentSection ? (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">{currentSection.title}</h2>
                        
                        {/* page content with markdown and latex rendering */}
                        {currentSection.pages && currentSection.pages[currentPage] && (
                            <div className="prose prose-slate max-w-none mb-8">
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                                    className="markdown-content"
                                >
                                    {currentSection.pages[currentPage].content}
                                </ReactMarkdown>
                            </div>
                        )}
                        
                        {/* pagination controls */}
                        <div className="flex justify-between items-center mt-8">
                            <button 
                                onClick={handlePrevPage}
                                disabled={currentPage === 0}
                                className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
                            >
                                Previous Page
                            </button>
                            
                            <span className="text-gray-600">
                                Page {currentPage + 1} of {currentSection.pages?.length || 1}
                            </span>
                            
                            <button 
                                onClick={handleNextPage}
                                disabled={!currentSection.pages || currentPage >= currentSection.pages.length - 1}
                                className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
                            >
                                Next Page
                            </button>
                        </div>
                        
                        {/* quiz button - only show on last page */}
                        {currentPage === (currentSection.pages?.length - 1) && (
                            <button 
                                onClick={() => handleQuizStart(currentSection.id)}
                                className="mt-8 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            >
                                Take Quiz
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="text-center text-gray-500">
                        Select a section to view its content
                    </div>
                )}
            </div>
        </div>
    )
} 