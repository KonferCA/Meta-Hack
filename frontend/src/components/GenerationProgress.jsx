import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { FiBook, FiClipboard, FiHelpCircle } from 'react-icons/fi'

export default function GenerationProgress({ progress, courseId }) {
    const navigate = useNavigate()
    const [showSuccess, setShowSuccess] = useState(false)
    const [highestContentPercentage, setHighestContentPercentage] = useState(0)
    
    // check if all tasks are completed
    const isAllCompleted = 
        progress.details?.status === 'completed' &&
        progress.content?.status === 'completed' &&
        progress.quiz?.status === 'completed'

    // show success animation when all complete
    useEffect(() => {
        if (isAllCompleted) {
            const timer = setTimeout(() => {
                setShowSuccess(true)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [isAllCompleted])

    const categories = [
        {
            name: 'Course Details',
            icon: <FiClipboard className="w-6 h-6" />,
            status: progress.details?.status || 'pending',
            stats: progress.details?.stats || null,
            loadingAnimation: (
                <motion.div 
                    className="w-6 h-6 border-2 border-blue-500 rounded-full border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
            )
        },
        {
            name: 'Course Content',
            icon: <FiBook className="w-6 h-6" />,
            status: progress.content?.status || 'pending',
            stats: progress.content?.stats || null,
            loadingAnimation: (
                <motion.div 
                    className="flex space-x-1"
                    animate={{ scale: [1, 0.8, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                >
                    {[...Array(3)].map((_, i) => (
                        <div 
                            key={i}
                            className="w-2 h-2 bg-blue-500 rounded-full"
                            style={{ animationDelay: `${i * 0.2}s` }}
                        />
                    ))}
                </motion.div>
            )
        },
        {
            name: 'Quiz Generation',
            icon: <FiHelpCircle className="w-6 h-6" />,
            status: progress.quiz?.status || 'pending',
            stats: progress.quiz?.stats || null,
            loadingAnimation: (
                <motion.div 
                    className="w-6 h-6 relative"
                    animate={{ rotate: [0, 180, 360] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    <div className="absolute inset-0 border-2 border-blue-500 rounded-full" 
                        style={{ clipPath: "polygon(50% 50%, 100% 0, 100% 100%)" }} />
                </motion.div>
            )
        }
    ]

    const handleViewCourse = () => {
        navigate({
            to: '/course/$courseId',
            params: { courseId: courseId.toString() }
        })
    }

    const renderProgressBar = (current, total) => {
        // ensure we have valid numbers and calculate percentage
        const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0
        
        return (
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                    className="bg-blue-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.2 }}
                />
            </div>
        )
    }

    const renderDetailedStats = (cat) => {
        // emoji mapping for each step
        const emojiSteps = {
            'Course Details': ['📝', '📚', '🎯', '✨'],
            'Course Content': ['📖', '📑', '✍️', '📘'],
            'Quiz Generation': ['❓', '🤔', '💭', '✅']
        }

        const getEmojis = (current, total) => {
            const emojis = emojiSteps[cat.name] || ['⭐']
            const progress = Math.min(Math.floor((current / total) * emojis.length), emojis.length)
            return (
                <div className="flex gap-3 justify-center mt-2">
                    {emojis.map((emoji, i) => (
                        <motion.span
                            key={i}
                            initial={{ scale: 0.5, opacity: 0.5 }}
                            animate={{ 
                                scale: i <= progress ? 1 : 0.5,
                                opacity: i <= progress ? 1 : 0.3
                            }}
                            className={`text-2xl ${i <= progress ? '' : 'grayscale'}`}
                        >
                            {emoji}
                        </motion.span>
                    ))}
                </div>
            )
        }

        switch (cat.name) {
            case 'Course Details':
                return (
                    <div className="space-y-2">
                        {cat.stats?.step && (
                            <p className="text-sm text-gray-600 text-center">{cat.stats.step}</p>
                        )}
                        {(cat.stats?.current && cat.stats?.total) && 
                            getEmojis(cat.stats.current, cat.stats.total)}
                    </div>
                )
            case 'Course Content':
                // update highest percentage if new percentage is higher
                if (cat.stats?.percentage > highestContentPercentage) {
                    setHighestContentPercentage(cat.stats.percentage)
                }

                return (
                    <div className="space-y-2">
                        {cat.stats?.step && (
                            <p className="text-sm text-gray-600 text-center">{cat.stats.step}</p>
                        )}
                        {cat.stats?.percentage !== undefined && (
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-blue-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.max(cat.stats.percentage, highestContentPercentage)}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        )}
                        {getEmojis(cat.stats?.pageCount || 0, cat.stats?.totalPages || 24)}
                    </div>
                )
            case 'Quiz Generation':
                return (
                    <div className="space-y-2">
                        {cat.stats?.step && (
                            <p className="text-sm text-gray-600 text-center">{cat.stats.step}</p>
                        )}
                        {cat.status === 'completed' ? 
                            getEmojis(1, 1) : 
                            getEmojis(cat.stats?.questionCount || 0, 4)}
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
                
                <div className="space-y-4">
                    {categories.map(cat => (
                        <motion.div 
                            key={cat.name}
                            layout
                            animate={{
                                height: cat.status === 'pending' ? 'auto' : '100%',
                                scale: cat.status === 'pending' ? 1.02 : 1
                            }}
                            className="border rounded-lg overflow-hidden"
                        >
                            <motion.div 
                                layout="position"
                                className={`p-4 ${
                                    cat.status === 'pending' 
                                        ? 'bg-blue-50' 
                                        : cat.status === 'completed'
                                        ? 'bg-green-50'
                                        : 'bg-white'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-blue-600">{cat.icon}</span>
                                    <h3 className="text-lg font-semibold">{cat.name}</h3>
                                    {cat.status === 'pending' && (
                                        <div className="ml-auto">
                                            {cat.loadingAnimation}
                                        </div>
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
                            </motion.div>
                        </motion.div>
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