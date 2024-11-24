import './App.css'
import { Router, Route, RootRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Root from './components/Root'
import CourseLanding from './components/CourseLanding'
import CourseView from './components/CourseView'
import StudentDashboard from './components/StudentDashboard'
import ProfessorDashboard from './components/ProfessorDashboard'
import CourseManage from './components/CourseManage'
import Login from './components/Login'
import Register from './components/Register'

const rootRoute = new RootRoute({
    component: Root,
})

const indexRoute = new Route({
    getParentRoute: () => rootRoute,
    path: '/',
    component: Login,
})

const loginRoute = new Route({
    getParentRoute: () => rootRoute,
    path: 'login',
    component: Login,
})

const registerRoute = new Route({
    getParentRoute: () => rootRoute,
    path: 'register',
    component: Register,
})

const courseLandingRoute = new Route({
    getParentRoute: () => rootRoute,
    path: 'courses/$courseId',
    component: CourseLanding,
})

const courseViewRoute = new Route({
    getParentRoute: () => rootRoute,
    path: 'course/$courseId',
    component: CourseView,
})

const courseManageRoute = new Route({
    getParentRoute: () => rootRoute,
    path: 'course/$courseId/manage',
    component: CourseManage,
})

const studentDashboardRoute = new Route({
    getParentRoute: () => rootRoute,
    path: 'dashboard/student',
    component: StudentDashboard,
})

const professorDashboardRoute = new Route({
    getParentRoute: () => rootRoute,
    path: 'dashboard/professor',
    component: ProfessorDashboard,
})

const routeTree = rootRoute.addChildren([
    indexRoute,
    loginRoute,
    registerRoute,
    courseLandingRoute,
    courseViewRoute,
    courseManageRoute,
    studentDashboardRoute,
    professorDashboardRoute,
])

const router = new Router({ routeTree })

const queryClient = new QueryClient()

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>
    )
}
