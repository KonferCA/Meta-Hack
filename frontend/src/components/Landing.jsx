import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { FiBook, FiTarget, FiAperture, FiArrowRight, FiCheck, FiPlay } from 'react-icons/fi'

// animation variants for stagger effects
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2
        }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
}

export default function Landing() {
    return (
        <div className="overflow-x-hidden">
            {/* hero section with animated particles */}
            <section className="relative min-h-screen flex items-center">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 opacity-90" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20 animate-pulse" />
                
                {/* floating shapes background */}
                <div className="absolute inset-0 overflow-hidden">
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-64 h-64 bg-white/10 rounded-full"
                            animate={{
                                x: [0, 100, 0],
                                y: [0, -100, 0],
                                scale: [1, 1.2, 1],
                                rotate: [0, 180, 360],
                            }}
                            transition={{
                                duration: 15 + i * 2,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                            }}
                        />
                    ))}
                </div>
                
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="text-center"
                    >
                        <motion.div
                            variants={itemVariants}
                            className="inline-block mb-4 px-6 py-2 bg-white/10 backdrop-blur-lg rounded-full"
                        >
                            <span className="text-yellow-300">✨ New:</span>
                            <span className="text-white ml-2">AI-Powered Study Plans</span>
                        </motion.div>

                        <motion.h1 
                            variants={itemVariants}
                            className="text-6xl md:text-8xl font-bold mb-6 text-white leading-tight drop-shadow-[0_15px_15px_rgba(0,0,0,0.15)]"
                        >
                            Transform Your
                            <div className="relative inline-block mx-4">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-[0_15px_15px_rgba(0,0,0,0.15)]">
                                    Learning
                                </span>
                                <motion.div 
                                    className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-500"
                                    animate={{
                                        scaleX: [0, 1],
                                        opacity: [0, 1],
                                    }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                />
                            </div>
                            Journey
                        </motion.h1>

                        <motion.p 
                            variants={itemVariants}
                            className="text-xl md:text-2xl mb-12 text-gray-100 max-w-3xl mx-auto leading-relaxed"
                        >
                            Harness the power of AI to master any subject. Create perfect study notes,
                            get instant feedback, and learn smarter, not harder.
                        </motion.p>

                        <motion.div 
                            variants={itemVariants}
                            className="flex gap-6 justify-center items-center"
                        >
                            <Link
                                to="/register"
                                className="group bg-white text-blue-600 px-8 py-4 rounded-full font-semibold
                                    hover:bg-blue-50 transition-all transform hover:scale-105 shadow-lg flex items-center"
                            >
                                Start Learning Free
                                <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                to="/demo"
                                className="group bg-transparent border-2 border-white text-white px-8 py-4 rounded-full font-semibold
                                    hover:bg-white/10 transition-all flex items-center"
                            >
                                <FiPlay className="mr-2" />
                                Watch Demo
                            </Link>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* stats section with floating cards */}
            <section className="py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-8"
                    >
                        <StatsCard number="10k+" label="Active Students" gradient="from-blue-400 to-blue-600" />
                        <StatsCard number="95%" label="Success Rate" gradient="from-purple-400 to-purple-600" />
                        <StatsCard number="50+" label="Subjects" gradient="from-pink-400 to-pink-600" />
                        <StatsCard number="24/7" label="AI Support" gradient="from-orange-400 to-orange-600" />
                    </motion.div>
                </div>
            </section>

            {/* features section with 3D cards */}
            <section className="py-32 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-50 to-white" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                            Why Students Love LlamaLearn
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Experience a revolutionary way of learning that adapts to your needs
                        </p>
                    </motion.div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <FeatureCard 
                            icon={<FiAperture className="w-10 h-10" />}
                            title="AI-Powered Learning"
                            description="Smart algorithms analyze your learning style and create personalized study plans"
                            gradient="from-blue-500 to-purple-500"
                        />
                        <FeatureCard 
                            icon={<FiBook className="w-10 h-10" />}
                            title="Smart Notes"
                            description="Transform your notes into interactive study materials with our AI assistant"
                            gradient="from-purple-500 to-pink-500"
                        />
                        <FeatureCard 
                            icon={<FiTarget className="w-10 h-10" />}
                            title="Progress Tracking"
                            description="Visual analytics and insights to keep you on track towards your goals"
                            gradient="from-pink-500 to-orange-500"
                        />
                    </div>
                </div>
            </section>

            {/* testimonials section with parallax */}
            <section className="py-32 bg-gradient-to-b from-gray-50 to-white relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-5xl font-bold text-center mb-20"
                    >
                        Student Success Stories
                    </motion.h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <TestimonialCard 
                            quote="LlamaLearn completely changed how I study!!"
                            author="Sarah K."
                            role="Medical Student"
                            image="/testimonial1.jpg"
                            gradient="from-blue-500 to-purple-500"
                        />
                        <TestimonialCard 
                            quote="The AI feedback is like having a personal tutor available 24/7. Amazing!"
                            author="James R."
                            role="Engineering Major"
                            image="/testimonial2.jpg"
                            gradient="from-purple-500 to-pink-500"
                        />
                        <TestimonialCard 
                            quote="Finally found a study tool that actually understands how I learn best."
                            author="Emily T."
                            role="Law Student"
                            image="/testimonial3.jpg"
                            gradient="from-pink-500 to-orange-500"
                        />
                    </div>
                </div>
            </section>

            {/* cta section with particles */}
            <section className="py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
                
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-5xl font-bold mb-8 text-white">Ready to Transform Your Learning?</h2>
                        <p className="text-xl mb-12 text-blue-100 max-w-2xl mx-auto">
                            Join thousands of students who are already learning smarter with LlamaLearn
                        </p>
                        <Link
                            to="/register"
                            className="group bg-white text-blue-600 px-12 py-4 rounded-full font-semibold
                                hover:bg-blue-50 transition-all transform hover:scale-105 inline-flex items-center"
                        >
                            Get Started Free
                            <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </motion.div>
                </div>
            </section>
        </div>
    )
}

// enhanced helper components
const StatsCard = ({ number, label, gradient }) => (
    <motion.div 
        whileHover={{ scale: 1.05, y: -5 }}
        className="relative p-8 rounded-2xl bg-white shadow-xl"
    >
        <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-10 rounded-2xl`} />
        <div className={`text-5xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent mb-4`}>
            {number}
        </div>
        <div className="text-gray-600 font-medium">{label}</div>
    </motion.div>
)

const FeatureCard = ({ icon, title, description, gradient }) => (
    <motion.div 
        whileHover={{ y: -10 }}
        className="relative group"
    >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
        <div className="relative bg-white p-8 rounded-2xl shadow-xl">
            <div className={`bg-gradient-to-r ${gradient} p-4 rounded-xl inline-block mb-6`}>
                <div className="text-white">{icon}</div>
            </div>
            <h3 className="text-2xl font-semibold mb-4">{title}</h3>
            <p className="text-gray-600 leading-relaxed">{description}</p>
        </div>
    </motion.div>
)

const TestimonialCard = ({ quote, author, role, image, gradient }) => (
    <motion.div 
        whileHover={{ scale: 1.02 }}
        className="relative group"
    >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
        <div className="relative bg-white p-8 rounded-2xl shadow-xl">
            <div className="flex items-center mb-6">
                <div className="relative">
                    <div className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-full blur-lg opacity-50`} />
                    <img 
                        src={image} 
                        alt={author} 
                        className="relative w-16 h-16 rounded-full object-cover border-2 border-white"
                    />
                </div>
                <div className="ml-4">
                    <div className="font-semibold text-lg">{author}</div>
                    <div className="text-gray-600">{role}</div>
                </div>
            </div>
            <p className="text-gray-700 italic leading-relaxed">"{quote}"</p>
        </div>
    </motion.div>
) 