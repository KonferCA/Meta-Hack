import { createLazyFileRoute } from '@tanstack/react-router'
import CourseManage from '../components/CourseManage'

export const Route = createLazyFileRoute('/course/$courseId/manage')({
    component: CourseManage
}) 