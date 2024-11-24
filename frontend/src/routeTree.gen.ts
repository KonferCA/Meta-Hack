/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

import { createFileRoute } from '@tanstack/react-router'

// Import Routes

import { Route as rootRoute } from './routes/__root'

// Create Virtual Routes

const RegisterLazyImport = createFileRoute('/register')()
const LoginLazyImport = createFileRoute('/login')()
const DashboardLazyImport = createFileRoute('/dashboard')()
const IndexLazyImport = createFileRoute('/')()
const CoursesCourseIdLazyImport = createFileRoute('/courses/$courseId')()
const CourseCourseIdLazyImport = createFileRoute('/course/$courseId')()
const CourseCourseIdManageLazyImport = createFileRoute(
  '/course/$courseId/manage',
)()

// Create/Update Routes

const RegisterLazyRoute = RegisterLazyImport.update({
  id: '/register',
  path: '/register',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/register.lazy').then((d) => d.Route))

const LoginLazyRoute = LoginLazyImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/login.lazy').then((d) => d.Route))

const DashboardLazyRoute = DashboardLazyImport.update({
  id: '/dashboard',
  path: '/dashboard',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/dashboard.lazy').then((d) => d.Route))

const IndexLazyRoute = IndexLazyImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/index.lazy').then((d) => d.Route))

const CoursesCourseIdLazyRoute = CoursesCourseIdLazyImport.update({
  id: '/courses/$courseId',
  path: '/courses/$courseId',
  getParentRoute: () => rootRoute,
} as any).lazy(() =>
  import('./routes/courses.$courseId.lazy').then((d) => d.Route),
)

const CourseCourseIdLazyRoute = CourseCourseIdLazyImport.update({
  id: '/course/$courseId',
  path: '/course/$courseId',
  getParentRoute: () => rootRoute,
} as any).lazy(() =>
  import('./routes/course.$courseId.lazy').then((d) => d.Route),
)

const CourseCourseIdManageLazyRoute = CourseCourseIdManageLazyImport.update({
  id: '/manage',
  path: '/manage',
  getParentRoute: () => CourseCourseIdLazyRoute,
} as any).lazy(() =>
  import('./routes/course.$courseId.manage.lazy').then((d) => d.Route),
)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexLazyImport
      parentRoute: typeof rootRoute
    }
    '/dashboard': {
      id: '/dashboard'
      path: '/dashboard'
      fullPath: '/dashboard'
      preLoaderRoute: typeof DashboardLazyImport
      parentRoute: typeof rootRoute
    }
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginLazyImport
      parentRoute: typeof rootRoute
    }
    '/register': {
      id: '/register'
      path: '/register'
      fullPath: '/register'
      preLoaderRoute: typeof RegisterLazyImport
      parentRoute: typeof rootRoute
    }
    '/course/$courseId': {
      id: '/course/$courseId'
      path: '/course/$courseId'
      fullPath: '/course/$courseId'
      preLoaderRoute: typeof CourseCourseIdLazyImport
      parentRoute: typeof rootRoute
    }
    '/courses/$courseId': {
      id: '/courses/$courseId'
      path: '/courses/$courseId'
      fullPath: '/courses/$courseId'
      preLoaderRoute: typeof CoursesCourseIdLazyImport
      parentRoute: typeof rootRoute
    }
    '/course/$courseId/manage': {
      id: '/course/$courseId/manage'
      path: '/manage'
      fullPath: '/course/$courseId/manage'
      preLoaderRoute: typeof CourseCourseIdManageLazyImport
      parentRoute: typeof CourseCourseIdLazyImport
    }
  }
}

// Create and export the route tree

interface CourseCourseIdLazyRouteChildren {
  CourseCourseIdManageLazyRoute: typeof CourseCourseIdManageLazyRoute
}

const CourseCourseIdLazyRouteChildren: CourseCourseIdLazyRouteChildren = {
  CourseCourseIdManageLazyRoute: CourseCourseIdManageLazyRoute,
}

const CourseCourseIdLazyRouteWithChildren =
  CourseCourseIdLazyRoute._addFileChildren(CourseCourseIdLazyRouteChildren)

export interface FileRoutesByFullPath {
  '/': typeof IndexLazyRoute
  '/dashboard': typeof DashboardLazyRoute
  '/login': typeof LoginLazyRoute
  '/register': typeof RegisterLazyRoute
  '/course/$courseId': typeof CourseCourseIdLazyRouteWithChildren
  '/courses/$courseId': typeof CoursesCourseIdLazyRoute
  '/course/$courseId/manage': typeof CourseCourseIdManageLazyRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexLazyRoute
  '/dashboard': typeof DashboardLazyRoute
  '/login': typeof LoginLazyRoute
  '/register': typeof RegisterLazyRoute
  '/course/$courseId': typeof CourseCourseIdLazyRouteWithChildren
  '/courses/$courseId': typeof CoursesCourseIdLazyRoute
  '/course/$courseId/manage': typeof CourseCourseIdManageLazyRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexLazyRoute
  '/dashboard': typeof DashboardLazyRoute
  '/login': typeof LoginLazyRoute
  '/register': typeof RegisterLazyRoute
  '/course/$courseId': typeof CourseCourseIdLazyRouteWithChildren
  '/courses/$courseId': typeof CoursesCourseIdLazyRoute
  '/course/$courseId/manage': typeof CourseCourseIdManageLazyRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/dashboard'
    | '/login'
    | '/register'
    | '/course/$courseId'
    | '/courses/$courseId'
    | '/course/$courseId/manage'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/dashboard'
    | '/login'
    | '/register'
    | '/course/$courseId'
    | '/courses/$courseId'
    | '/course/$courseId/manage'
  id:
    | '__root__'
    | '/'
    | '/dashboard'
    | '/login'
    | '/register'
    | '/course/$courseId'
    | '/courses/$courseId'
    | '/course/$courseId/manage'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexLazyRoute: typeof IndexLazyRoute
  DashboardLazyRoute: typeof DashboardLazyRoute
  LoginLazyRoute: typeof LoginLazyRoute
  RegisterLazyRoute: typeof RegisterLazyRoute
  CourseCourseIdLazyRoute: typeof CourseCourseIdLazyRouteWithChildren
  CoursesCourseIdLazyRoute: typeof CoursesCourseIdLazyRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexLazyRoute: IndexLazyRoute,
  DashboardLazyRoute: DashboardLazyRoute,
  LoginLazyRoute: LoginLazyRoute,
  RegisterLazyRoute: RegisterLazyRoute,
  CourseCourseIdLazyRoute: CourseCourseIdLazyRouteWithChildren,
  CoursesCourseIdLazyRoute: CoursesCourseIdLazyRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.jsx",
      "children": [
        "/",
        "/dashboard",
        "/login",
        "/register",
        "/course/$courseId",
        "/courses/$courseId"
      ]
    },
    "/": {
      "filePath": "index.lazy.jsx"
    },
    "/dashboard": {
      "filePath": "dashboard.lazy.jsx"
    },
    "/login": {
      "filePath": "login.lazy.jsx"
    },
    "/register": {
      "filePath": "register.lazy.jsx"
    },
    "/course/$courseId": {
      "filePath": "course.$courseId.lazy.jsx",
      "children": [
        "/course/$courseId/manage"
      ]
    },
    "/courses/$courseId": {
      "filePath": "courses.$courseId.lazy.jsx"
    },
    "/course/$courseId/manage": {
      "filePath": "course.$courseId.manage.lazy.jsx",
      "parent": "/course/$courseId"
    }
  }
}
ROUTE_MANIFEST_END */
