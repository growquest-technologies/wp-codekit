import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './layout/RootLayout';
import { Home } from './pages/Home';
import { ToolsIndex } from './pages/ToolsIndex';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { GeneratorRoute } from './pages/generators/GeneratorRoute';
import { CategoryHub } from './pages/CategoryHub';
import { Login } from './pages/auth/Login';
import { Account } from './pages/auth/Account';
import { Pricing } from './pages/auth/Pricing';
import { NotFound } from './pages/NotFound';
import { ProtectedRoute } from './lib/auth/ProtectedRoute';
import { LazyRoute } from './components/ui/LazyRoute';

// The two colour tools carry their own shells (and, for the gradient tool, a fair
// amount of geometry), so they are code-split like every generator rather than
// riding along in the entry chunk on every page of the site.
const ColorTool = lazy(() => import('./pages/ColorTool').then((m) => ({ default: m.ColorTool })));
const GradientTool = lazy(() => import('./pages/GradientTool').then((m) => ({ default: m.GradientTool })));


export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'tools', element: <ToolsIndex /> },
      // Static before dynamic: these two have their own shells rather than a
      // GeneratorShell workspace, so they never go through GeneratorRoute.
      { path: 'tools/color', element: <LazyRoute><ColorTool /></LazyRoute> },
      { path: 'tools/gradient', element: <LazyRoute><GradientTool /></LazyRoute> },
      { path: 'tools/:toolId', element: <GeneratorRoute /> },
      { path: 'category/:cat', element: <CategoryHub /> },
      { path: 'about', element: <About /> },
      { path: 'contact', element: <Contact /> },
      { path: 'login', element: <Login /> },
      { path: 'pricing', element: <Pricing /> },
      {
        path: 'account',
        element: (
          <ProtectedRoute>
            <Account />
          </ProtectedRoute>
        ),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
