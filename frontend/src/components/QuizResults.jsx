export default function QuizResults({ result, onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg max-w-2xl w-full">
                <h2 className="text-2xl font-bold mb-4">Quiz Results</h2>
                
                <div className="mb-8">
                    <div className="text-center mb-6">
                        <div className="text-6xl font-bold mb-2">
                            {result.score}%
                        </div>
                        <div className="text-gray-600">
                            {result.score >= 70 ? 'Great job!' : 'Keep practicing!'}
                        </div>
                    </div>

                    {/* show correct/incorrect answers */}
                    <div className="space-y-6">
                        {result.questions?.map((q, index) => (
                            <div key={q.id} className={`p-4 rounded-lg ${
                                q.isCorrect ? 'bg-green-50' : 'bg-red-50'
                            }`}>
                                <div className="font-semibold mb-2">
                                    Question {index + 1}: {q.question}
                                </div>
                                <div className="text-sm">
                                    <div className={`${q.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                        Your answer: {q.yourAnswer}
                                    </div>
                                    {!q.isCorrect && (
                                        <div className="text-green-600">
                                            Correct answer: {q.correctAnswer}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
} 