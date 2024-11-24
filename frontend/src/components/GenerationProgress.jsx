import { motion } from 'framer-motion'

export default function GenerationProgress({ progress }) {
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

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4"
            >
                <h2 className="text-2xl font-bold mb-6">Generating Your Course</h2>
                
                <div className="space-y-6">
                    {categories.map(cat => (
                        <div key={cat.name} className="border rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-2">
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
                                        className="ml-auto text-green-500"
                                    >
                                        ✓
                                    </motion.div>
                                )}
                            </div>
                            
                            {cat.stats && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-sm text-gray-600 pl-9"
                                >
                                    {cat.name === 'Course Details' && (
                                        <ul className="list-disc pl-4">
                                            <li>Difficulty: {cat.stats.difficulty}</li>
                                            <li>Duration: {cat.stats.estimatedHours} hours</li>
                                            <li>{cat.stats.outcomesCount} learning outcomes</li>
                                        </ul>
                                    )}
                                    {cat.name === 'Course Content' && (
                                        <ul className="list-disc pl-4">
                                            <li>{cat.stats.sectionCount} sections generated</li>
                                            <li>{cat.stats.wordCount} words of content</li>
                                        </ul>
                                    )}
                                    {cat.name === 'Quiz Generation' && (
                                        <ul className="list-disc pl-4">
                                            <li>{cat.stats.questionCount} questions generated</li>
                                            <li>{cat.stats.optionCount} total answer options</li>
                                        </ul>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    )
} 