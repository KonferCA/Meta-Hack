import { useState, useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function CourseManage() {
    const { courseId } = useParams({ from: '/course/$courseId/manage' })
    const { user } = useAuth()
    const [course, setCourse] = useState(null)
    const [sections, setSections] = useState([])
    const [students, setStudents] = useState([])
    const [newQuiz, setNewQuiz] = useState({
        sectionId: '',
        questions: [{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]
    })

    useEffect(() => {
        const fetchCourseData = async () => {
            try {
                // fetch course details
                const courseRes = await fetch(
                    `${import.meta.env.VITE_API_URL}/courses/${courseId}/manage`,
                    {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    }
                )
                if (courseRes.ok) {
                    const courseData = await courseRes.json()
                    setCourse(courseData)
                    setSections(courseData.sections)
                }

                // fetch enrolled students
                const studentsRes = await fetch(
                    `${import.meta.env.VITE_API_URL}/courses/${courseId}/students`,
                    {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    }
                )
                if (studentsRes.ok) {
                    const studentsData = await studentsRes.json()
                    setStudents(studentsData)
                }
            } catch (error) {
                toast.error('Failed to load course data')
            }
        }
        fetchCourseData()
    }, [courseId])

    const handleQuizSubmit = async (e) => {
        e.preventDefault()
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/courses/${courseId}/sections/${newQuiz.sectionId}/quiz`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(newQuiz)
                }
            )
            if (response.ok) {
                toast.success('Quiz created successfully')
                setNewQuiz({
                    sectionId: '',
                    questions: [{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]
                })
            }
        } catch (error) {
            toast.error('Failed to create quiz')
        }
    }

    if (!course) return <div>Loading...</div>

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-8">{course.title} - Management</h1>

            {/* sections management */}
            <section className="mb-12">
                <h2 className="text-xl font-semibold mb-4">Sections</h2>
                <div className="space-y-4">
                    {sections.map(section => (
                        <div key={section.id} className="border p-4 rounded">
                            <h3 className="font-bold">{section.title}</h3>
                            <div className="mt-2 space-x-2">
                                <button className="bg-blue-500 text-white px-3 py-1 rounded">
                                    Edit
                                </button>
                                <button className="bg-red-500 text-white px-3 py-1 rounded">
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* quiz creation */}
            <section className="mb-12">
                <h2 className="text-xl font-semibold mb-4">Create Quiz</h2>
                <form onSubmit={handleQuizSubmit} className="space-y-4">
                    <select
                        value={newQuiz.sectionId}
                        onChange={e => setNewQuiz({...newQuiz, sectionId: e.target.value})}
                        className="w-full p-2 border rounded"
                    >
                        <option value="">Select Section</option>
                        {sections.map(section => (
                            <option key={section.id} value={section.id}>
                                {section.title}
                            </option>
                        ))}
                    </select>
                    
                    {/* quiz questions */}
                    {/* TODO: Add dynamic quiz question form */}
                    
                    <button
                        type="submit"
                        className="bg-green-500 text-white px-4 py-2 rounded"
                    >
                        Create Quiz
                    </button>
                </form>
            </section>

            {/* enrolled students */}
            <section>
                <h2 className="text-xl font-semibold mb-4">Enrolled Students</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map(student => (
                        <div key={student.id} className="border p-4 rounded">
                            <h3 className="font-bold">{student.username}</h3>
                            <p className="text-gray-600">{student.email}</p>
                            <div className="mt-2">
                                <p>Progress: {student.progress}%</p>
                                {/* TODO: Add more student progress details */}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
} 