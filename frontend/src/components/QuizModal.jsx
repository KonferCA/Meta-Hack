import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function QuizModal({ quiz, onClose, onComplete }) {
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState({})
    const [timeLeft, setTimeLeft] = useState(300)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => prev - 1)
            }, 1000)
            return () => clearInterval(timer)
        } else {
            handleSubmit()
        }
    }, [timeLeft])

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleAnswer = (questionId, choiceId) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: choiceId
        }))
    }

    const handleSubmit = async () => {
        if (isSubmitting) return
        setIsSubmitting(true)

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/quizzes/${quiz.id}/submit`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(answers)
                }
            )
            
            if (response.ok) {
                const result = await response.json()
                onComplete(result)
            }
        } catch (error) {
            toast.error('Failed to submit quiz')
        } finally {
            setIsSubmitting(false)
        }
    }

    const question = quiz.questions[currentQuestion]
    const progress = ((currentQuestion + 1) / quiz.questions.length) * 100

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="bg-white w-full max-w-4xl mx-4 rounded-xl shadow-2xl overflow-hidden"
            >
                <div className="bg-white px-8 py-6 border-b border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-800">Course Quiz</h2>
                        <div className={`text-lg font-mono ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-gray-600'}`}>
                            Time Left: {formatTime(timeLeft)}
                        </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <motion.div 
                            className="bg-blue-600 h-2.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                        Question {currentQuestion + 1} of {quiz.questions.length}
                    </div>
                </div>

                <div className="p-8">
                    <motion.div
                        key={question.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mb-8"
                    >
                        <h3 className="text-xl font-medium text-gray-800 mb-6">
                            {question.question}
                        </h3>
                        <div className="space-y-3">
                            {question.choices.map(choice => (
                                <motion.button
                                    key={choice.id}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    transition={{ duration: 0.1 }}
                                    onClick={() => handleAnswer(question.id, choice.id)}
                                    className={`w-full p-4 text-left rounded-lg transition-all
                                        ${answers[question.id] === choice.id 
                                            ? 'bg-blue-500 text-white shadow-md'
                                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                                        }`}
                                >
                                    {choice.content}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                </div>

                <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
                    <div className="flex justify-between">
                        <button
                            onClick={() => setCurrentQuestion(prev => prev - 1)}
                            disabled={currentQuestion === 0}
                            className={`px-6 py-2 rounded-lg transition-all
                                ${currentQuestion === 0 
                                    ? 'bg-gray-300 cursor-not-allowed' 
                                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                                }`}
                        >
                            Previous
                        </button>
                        
                        {currentQuestion === quiz.questions.length - 1 ? (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || Object.keys(answers).length !== quiz.questions.length}
                                className={`px-6 py-2 rounded-lg transition-all
                                    ${isSubmitting || Object.keys(answers).length !== quiz.questions.length
                                        ? 'bg-green-300 cursor-not-allowed'
                                        : 'bg-green-500 hover:bg-green-600 text-white'
                                    }`}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                            </button>
                        ) : (
                            <button
                                onClick={() => setCurrentQuestion(prev => prev + 1)}
                                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
                            >
                                Next
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}