import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiCheck, FiXCircle } from 'react-icons/fi'

export default function QuizResults({ result, onClose }) {
    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
            >
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden"
                >
                    <div className="p-8">
                        <h2 className="text-2xl font-bold mb-8 text-gray-800">Quiz Results</h2>
                        
                        <div className="mb-8">
                            <motion.div 
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-center mb-8"
                            >
                                <div className="relative inline-block">
                                    <motion.div 
                                        className="text-6xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent"
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

                            <motion.div 
                                className="space-y-4"
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
                                            hidden: { x: -20, opacity: 0 },
                                            visible: { x: 0, opacity: 1 }
                                        }}
                                        className={`p-6 rounded-lg border ${
                                            q.isCorrect 
                                                ? 'bg-green-50 border-green-200' 
                                                : 'bg-red-50 border-red-200'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1">
                                                {q.isCorrect 
                                                    ? <FiCheck className="text-green-500 text-xl" />
                                                    : <FiX className="text-red-500 text-xl" />
                                                }
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-semibold mb-2 text-gray-800">
                                                    Question {index + 1}: {q.question}
                                                </div>
                                                <div className="space-y-1 text-sm">
                                                    <div className={`${
                                                        q.isCorrect 
                                                            ? 'text-green-600' 
                                                            : 'text-red-600'
                                                    }`}>
                                                        Your answer: {q.yourAnswer}
                                                    </div>
                                                    {!q.isCorrect && (
                                                        <div className="text-green-600">
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
                        
                        <motion.div 
                            className="flex justify-end"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            <motion.button
                                onClick={onClose}
                                whileTap={{ scale: 0.95 }}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-shadow"
                            >
                                Close Results
                            </motion.button>
                        </motion.div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
} 