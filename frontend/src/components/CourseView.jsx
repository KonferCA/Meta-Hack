import { useState, useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { useAuth } from '../contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { FiHelpCircle, FiAlertTriangle, FiBook, FiArrowRight, FiArrowLeft, FiCheckCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import QuizModal from './QuizModal'
import QuizResults from './QuizResults'

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

    if (!course) return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50 flex justify-center items-center">
            <div className="w-16 h-16 relative">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50">
            <div className="flex">
                {/* sidebar with section navigation */}
                <motion.div 
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="w-80 bg-white shadow-lg p-6 min-h-screen sticky top-0"
                >
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h2>
                        <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                    </div>

                    <div className="space-y-2">
                        {sections.map(section => (
                            <motion.div 
                                key={section.id}
                                whileHover={{ x: 4 }}
                                onClick={() => handleSectionClick(section)}
                                className={`
                                    p-4 rounded-xl cursor-pointer transition-all
                                    ${currentSection?.id === section.id 
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                                        : 'hover:bg-gray-50'
                                    }
                                    ${progress[section.id]?.completed ? 'border-l-4 border-green-500' : ''}
                                `}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{section.title}</span>
                                    {progress[section.id]?.completed && (
                                        <FiCheckCircle className="text-green-500" />
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <motion.button
                        onClick={() => handleQuizButtonClick()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="mt-8 w-full p-4 bg-gradient-to-r from-purple-500 to-pink-500 
                            text-white rounded-xl shadow-md hover:shadow-lg transition-all
                            flex items-center justify-center group"
                    >
                        Take Final Quiz
                        <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                </motion.div>

                {/* main content area */}
                <div className="flex-1 p-8 max-w-4xl mx-auto">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {currentSection ? (
                            <motion.div variants={itemVariants}>
                                <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                                    <h2 className="text-3xl font-bold text-gray-900 mb-6">
                                        {currentSection.title}
                                    </h2>
                                    
                                    {currentSection.pages && currentSection.pages[currentPage] && (
                                        <div className="prose prose-slate max-w-none">
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                rehypePlugins={[rehypeRaw, rehypeKatex]}
                                                className="markdown-content"
                                            >
                                                {currentSection.pages[currentPage].content}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>

                                {/* pagination controls */}
                                <div className="flex justify-between items-center mt-8">
                                    <motion.button 
                                        onClick={handlePrevPage}
                                        disabled={currentPage === 0}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="flex items-center px-6 py-3 bg-white rounded-xl shadow-md
                                            disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg
                                            transition-all group"
                                    >
                                        <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
                                        Previous
                                    </motion.button>
                                    
                                    <span className="text-gray-600 font-medium">
                                        Page {currentPage + 1} of {currentSection.pages?.length || 1}
                                    </span>
                                    
                                    <motion.button 
                                        onClick={handleNextPage}
                                        disabled={!currentSection.pages || currentPage >= currentSection.pages.length - 1}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="flex items-center px-6 py-3 bg-white rounded-xl shadow-md
                                            disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg
                                            transition-all group"
                                    >
                                        Next
                                        <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                                    </motion.button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                variants={itemVariants}
                                className="bg-white rounded-2xl shadow-lg p-12 text-center"
                            >
                                <FiBook className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    Select a section to begin
                                </h3>
                                <p className="text-gray-600">
                                    Choose a section from the sidebar to start learning
                                </p>
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* quiz confirmation modal */}
            <AnimatePresence>
                {showQuizConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl"
                        >
                            <div className="text-center mb-6">
                                <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiAlertTriangle className="w-8 h-8 text-yellow-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Are you sure?</h3>
                                <p className="text-gray-600">
                                    You haven't viewed all sections yet. It's recommended to review all material before taking the quiz.
                                </p>
                            </div>
                            
                            <div className="flex gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowQuizConfirm(false)}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500
                                        text-white rounded-xl shadow-md hover:shadow-lg transition-all"
                                >
                                    Review Material
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setShowQuizConfirm(false)
                                        handleQuizStart(currentSection.id)
                                    }}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-900
                                        text-white rounded-xl shadow-md hover:shadow-lg transition-all"
                                >
                                    Take Quiz Anyway
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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