import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

export default function GenerationProgress({ progress, courseId }) {
    const navigate = useNavigate()
    const [showSuccess, setShowSuccess] = useState(false)
    
    // check if all tasks are completed
    const isAllCompleted = 
        progress.details?.status === 'completed' &&
        progress.content?.status === 'completed' &&
        progress.quiz?.status === 'completed'

    // show success animation when all complete
    useEffect(() => {
        if (isAllCompleted) {
            // delay before showing success
            const timer = setTimeout(() => {
                setShowSuccess(true)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [isAllCompleted])

    const categories = [
        {
            name: 'Course Details',
            icon: '📋',
            status: progress.details?.status || 'pending',
            stats: progress.details?.stats || null
        },
        {
            name: 'Course Content',
            icon: '📚',
            status: progress.content?.status || 'pending',
            stats: progress.content?.stats || null
        },
        {
            name: 'Quiz Generation',
            icon: '❓',
            status: progress.quiz?.status || 'pending',
            stats: progress.quiz?.stats || null
        }
    ]

    const handleViewCourse = () => {
        navigate({ 
            to: '/course/$courseId/manage',
            params: { courseId: courseId.toString() }
        })
    }

    const renderProgressBar = (current, total) => (
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <motion.div
                className="bg-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(current / total) * 100}%` }}
                transition={{ duration: 0.2 }}
            />
        </div>
    )

    const renderDetailedStats = (cat) => {
        switch (cat.name) {
            case 'Course Details':
                return (
                    <div className="space-y-2">
                        {cat.stats?.step && (
                            <p className="text-sm text-gray-600">{cat.stats.step}</p>
                        )}
                        {cat.stats?.percentage && renderProgressBar(cat.stats.current, cat.stats.total)}
                        <ul className="list-disc pl-4 text-sm">
                            {cat.stats?.difficulty && <li>Difficulty: {cat.stats.difficulty}</li>}
                            {cat.stats?.estimatedHours && <li>Duration: {cat.stats.estimatedHours} hours</li>}
                            {cat.stats?.outcomesCount && <li>{cat.stats.outcomesCount} learning outcomes</li>}
                        </ul>
                    </div>
                )
            case 'Course Content':
                return (
                    <div className="space-y-2">
                        {cat.stats?.step && (
                            <p className="text-sm text-gray-600">{cat.stats.step}</p>
                        )}
                        {cat.stats?.percentage && renderProgressBar(cat.stats.current, cat.stats.total)}
                        <ul className="list-disc pl-4 text-sm">
                            <li>{cat.stats?.currentSection || 'Preparing sections...'}</li>
                            <li>{cat.stats?.pageCount || 0} of {cat.stats?.totalPages || '...'} pages</li>
                            <li>{cat.stats?.wordCount || 0} words generated</li>
                        </ul>
                    </div>
                )
            case 'Quiz Generation':
                return (
                    <div className="space-y-2">
                        {cat.stats?.step && (
                            <p className="text-sm text-gray-600">{cat.stats.step}</p>
                        )}
                        {cat.stats?.percentage && renderProgressBar(cat.stats.current, cat.stats.total)}
                        <ul className="list-disc pl-4 text-sm">
                            <li>{cat.stats?.questionCount || 0} questions generated</li>
                            <li>{cat.stats?.optionCount || 0} total answer options</li>
                        </ul>
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 relative overflow-hidden"
            >
                <h2 className="text-2xl font-bold mb-6">Generating Your Course</h2>
                
                <div className="space-y-6">
                    {categories.map(cat => (
                        <div key={cat.name} className="border rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-2xl">{cat.icon}</span>
                                <h3 className="text-lg font-semibold">{cat.name}</h3>
                                {cat.status === 'pending' && (
                                    <motion.div 
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="ml-auto"
                                    >
                                        ⚡
                                    </motion.div>
                                )}
                                {cat.status === 'completed' && (
                                    <motion.div 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="ml-auto text-green-500 text-xl"
                                    >
                                        ✓
                                    </motion.div>
                                )}
                            </div>
                            
                            {renderDetailedStats(cat)}
                        </div>
                    ))}
                </div>

                {/* Success animation overlay */}
                <AnimatePresence>
                    {showSuccess && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.2, 1] }}
                                transition={{ duration: 0.5 }}
                                className="text-6xl mb-4"
                            >
                                🎉
                            </motion.div>
                            <motion.h3
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-2xl font-bold text-green-600 mb-6"
                            >
                                Course Created Successfully!
                            </motion.h3>
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                onClick={handleViewCourse}
                                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                View Course
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    )
} 