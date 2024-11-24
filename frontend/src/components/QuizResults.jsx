import { motion, AnimatePresence } from 'framer-motion'
import { FiXCircle, FiCheck, FiX } from 'react-icons/fi'
import ReactConfetti from 'react-confetti'
import { useState, useEffect } from 'react'
import QuizReview from './QuizReview'

export default function QuizResults({ result, onClose }) {
    // add window size state for confetti
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    })

    // handle window resize
    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            })
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const [showReview, setShowReview] = useState(false)

    return (
        <AnimatePresence>
            {/* add confetti for scores >= 50% */}
            {result.score >= 50 && (
                <ReactConfetti
                    width={windowSize.width}
                    height={windowSize.height}
                    recycle={false}
                    numberOfPieces={200}
                    gravity={0.2}
                />
            )}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center overflow-y-auto pt-8 pb-8"
            >
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 "
                >
                    {/* Header */}
                    <div className="p-8">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-800">Quiz Results</h2>
                            <button 
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-700 bg-transparent border-none p-0 m-0 cursor-pointer"
                                style={{ background: 'none' }}
                            >
                                <FiXCircle className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <motion.div 
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-center mb-8"
                        >
                            <div className="relative inline-block">
                                <motion.div 
                                    className="text-6xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent"
                                    initial={{ y: 20 }}
                                    animate={{ y: 0 }}
                                    transition={{ delay: 0.3, type: "spring" }}
                                >
                                    {result.score}%
                                </motion.div>
                            </div>
                            <motion.div 
                                className="text-gray-600 text-lg"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                {result.score >= 70 ? 
                                    '🎉 Excellent work!' : 
                                    '💪 Keep going, you\'ve got this!'}
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* Questions */}
                    <div className="px-8">
                        <motion.div 
                            className="space-y-6"
                            initial="hidden"
                            animate="visible"
                            variants={{
                                hidden: { opacity: 0 },
                                visible: {
                                    opacity: 1,
                                    transition: {
                                        staggerChildren: 0.1
                                    }
                                }
                            }}
                        >
                            {result.questions?.map((q, index) => (
                                <motion.div
                                    key={q.id}
                                    variants={{
                                        hidden: { opacity: 0, y: 20 },
                                        visible: { opacity: 1, y: 0 }
                                    }}
                                    className={`p-6 rounded-xl shadow-sm border ${
                                        q.isCorrect 
                                            ? 'bg-green-50/50 border-green-100' 
                                            : 'bg-red-50/50 border-red-100'
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-full ${
                                            q.isCorrect ? 'bg-green-100' : 'bg-red-100'
                                        }`}>
                                            {q.isCorrect 
                                                ? <FiCheck className="w-5 h-5 text-green-600" />
                                                : <FiX className="w-5 h-5 text-red-600" />
                                            }
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-800 mb-2">
                                                Question {index + 1}: {q.question}
                                            </div>
                                            <div className="space-y-1">
                                                <div className={`text-sm ${
                                                    q.isCorrect ? 'text-gray-700' : 'text-gray-700'
                                                }`}>
                                                    Your answer: {q.yourAnswer}
                                                </div>
                                                {!q.isCorrect && (
                                                    <div className="text-sm text-gray-700">
                                                        Correct answer: {q.correctAnswer}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-gray-200 mt-8">
                        <motion.button
                            onClick={onClose}
                            whileTap={{ scale: 0.95 }}
                            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 
                                text-white rounded-lg hover:shadow-lg transition-shadow"
                        >
                            Close Results
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowReview(true)}
                            className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 
                                text-white rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                            Generate Personalized Review
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>

            {showReview && (
                <QuizReview 
                    quizId={result.id} 
                    wrongQuestions={result.questions.filter(q => !q.isCorrect)}
                    onClose={() => setShowReview(false)}
                />
            )}
        </AnimatePresence>
    )
} 