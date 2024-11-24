import { Link } from '@tanstack/react-router'

export default function Landing() {
    return (
        <div>
            {/* hero section */}
            <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            Learn Anything, Anytime, Anywhere
                        </h1>
                        <p className="text-xl md:text-2xl mb-8 text-blue-100">
                            Join our platform and start your learning journey today
                        </p>
                        <Link
                            to="/register"
                            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold
                                hover:bg-blue-50 transition-colors inline-block"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </section>

            {/* features section */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center mb-12">Why Choose LearnHub?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center p-6">
                            <div className="text-blue-600 text-4xl mb-4">📚</div>
                            <h3 className="text-xl font-semibold mb-2">Quality Content</h3>
                            <p className="text-gray-600">
                                Expert-curated courses designed to help you succeed
                            </p>
                        </div>
                        <div className="text-center p-6">
                            <div className="text-blue-600 text-4xl mb-4">⚡</div>
                            <h3 className="text-xl font-semibold mb-2">Learn at Your Pace</h3>
                            <p className="text-gray-600">
                                Flexible learning schedule that fits your lifestyle
                            </p>
                        </div>
                        <div className="text-center p-6">
                            <div className="text-blue-600 text-4xl mb-4">🎯</div>
                            <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
                            <p className="text-gray-600">
                                Monitor your learning journey with detailed analytics
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
} 