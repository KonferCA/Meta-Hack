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
import QuizModal from './QuizModal'
import QuizResults from './QuizResults'
import { FiHelpCircle, FiAlertTriangle } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'

export default function CourseView() {
    const { courseId } = useParams({ from: '/course/$courseId' })
    const { user } = useAuth()
    const [course, setCourse] = useState(null)
    const [sections, setSections] = useState([])
    const [currentSection, setCurrentSection] = useState(null)
    const [progress, setProgress] = useState({})
    const [currentPage, setCurrentPage] = useState(0)
    const PAGES_PER_VIEW = 1  // show one page at a time
    const [quiz, setQuiz] = useState(null)
    const [showQuiz, setShowQuiz] = useState(false)
    const [quizResults, setQuizResults] = useState(null)
    const [showQuizConfirm, setShowQuizConfirm] = useState(false)

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
                const quizData = await response.json()
                setQuiz(quizData)
                setShowQuiz(true)
            }
        } catch (error) {
            toast.error('Failed to load quiz')
        }
    }

    const handleQuizComplete = (result) => {
        setShowQuiz(false)
        setQuizResults(result)
    }

    const handleCloseResults = () => {
        setQuizResults(null)
        setQuiz(null)
    }

    const handleQuizButtonClick = () => {
        // check if current section is completed
        const allSectionsViewed = sections.every(section => 
            progress[section.id]?.viewed
        )
        
        if (!allSectionsViewed) {
            setShowQuizConfirm(true)
        } else {
            handleQuizStart(currentSection.id)
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
                    
                    {/* quiz button */}
                    <motion.button
                        onClick={() => handleQuizButtonClick()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="mt-6 w-full p-3 bg-gradient-to-r from-purple-500 to-indigo-600 
                            text-white rounded-lg shadow-md hover:shadow-lg transition-all"
                    >
                        Take Final Quiz
                    </motion.button>
                </div>
            </div>

            {/* confirmation modal */}
            <AnimatePresence>
                {showQuizConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
                        >
                            <div className="text-center mb-6">
                                <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiAlertTriangle className="w-8 h-8 text-yellow-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">Are you sure?</h3>
                                <p className="text-gray-600 mt-2">
                                    You haven't viewed all sections yet. It's recommended to review all material before taking the quiz.
                                </p>
                            </div>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowQuizConfirm(false)}
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg
                                        hover:bg-purple-700 transition-colors"
                                >
                                    Review Material
                                </button>
                                <button
                                    onClick={() => {
                                        setShowQuizConfirm(false)
                                        handleQuizStart(currentSection.id)
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg
                                        hover:bg-gray-900 transition-colors"
                                >
                                    Take Quiz Anyway
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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

                        {showQuiz && quiz && (
                            <QuizModal 
                                quiz={quiz}
                                onClose={() => setShowQuiz(false)}
                                onComplete={handleQuizComplete}
                            />
                        )}
                    </div>
                ) : (
                    <div className="text-center text-gray-500">
                        Select a section to view its content
                    </div>
                )}
            </div>

            {/* Add QuizResults modal */}
            {quizResults && (
                <QuizResults 
                    result={quizResults}
                    onClose={handleCloseResults}
                />
            )}
        </div>
    )
} 