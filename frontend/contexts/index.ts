/**
 * Context providers for the ER Viewer application.
 *
 * @module contexts
 */

export {
  DiagramProvider,
  useDiagram,
  type DiagramContextValue,
  type DiagramEntry,
  type DiagramState,
  type DiagramProviderProps,
  type BreadcrumbItem,
} from './DiagramContext';

export {
  ThemeProvider,
  useTheme,
  type Theme,
  type ResolvedTheme,
  type ThemeContextValue,
  type ThemeProviderProps,
} from './ThemeContext';
