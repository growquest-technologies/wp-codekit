import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './layout/RootLayout';
import { Home } from './pages/Home';
import { ToolsIndex } from './pages/ToolsIndex';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { GeneratorRoute } from './pages/generators/GeneratorRoute';
import { CategoryHub } from './pages/CategoryHub';
import { ColorTool } from './pages/ColorTool';
import { Login } from './pages/auth/Login';
import { Account } from './pages/auth/Account';
import { Pricing } from './pages/auth/Pricing';
import { NotFound } from './pages/NotFound';
import { ProtectedRoute } from './lib/auth/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'tools', element: <ToolsIndex /> },
      // Static before dynamic: the Color Tool has its own shell rather than a
      // GeneratorShell workspace, so it never goes through GeneratorRoute.
      { path: 'tools/color', element: <ColorTool /> },
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
