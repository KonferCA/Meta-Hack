import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function QuizReview({ quizId, wrongQuestions, previousScore, onClose }) {
    const [review, setReview] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [reviewState, setReviewState] = useState(null)
    const [reviewAction, setReviewAction] = useState(null)

    useEffect(() => {
        const fetchReview = async () => {
            try {
                const response = await fetch(`/api/quizzes/${quizId}/review`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ wrongQuestions })
                })
                
                if (!response.ok) throw new Error('Failed to fetch review')
                
                const data = await response.json()
                setReview(data.review)
                setReviewState(data.state)
                setReviewAction(data.action)
            } catch (err) {
                setError('Failed to load review. Please try again.')
            } finally {
                setLoading(false)
            }
        }
        fetchReview()
    }, [quizId, wrongQuestions])

    // submit feedback after next quiz
    const submitReviewFeedback = async (newScore) => {
        try {
            await fetch(`/api/quizzes/${quizId}/review/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    state: reviewState,
                    action: reviewAction,
                    old_score: previousScore,
                    new_score: newScore
                })
            })
        } catch (err) {
            console.error('Failed to submit review feedback:', err)
        }
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
        >
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">Personalized Review</h2>
                </div>
                
                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                        </div>
                    ) : error ? (
                        <div className="text-red-500 text-center py-8">{error}</div>
                    ) : (
                        <div className="prose max-w-none">
                            {review}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </motion.div>
    )
}