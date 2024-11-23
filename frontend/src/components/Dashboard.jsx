import { useAuth } from '../contexts/AuthContext'
import ProfessorDashboard from './ProfessorDashboard'
import StudentDashboard from './StudentDashboard'

export default function Dashboard() {
    const { user } = useAuth()
    
    if (!user) return null
    
    return user.role === 'professor' ? <ProfessorDashboard /> : <StudentDashboard />
} 