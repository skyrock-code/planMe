/**
 * @file PageWrapper.jsx
 * @description Higher-order layout wrapper that combines LoadingSpinner
 *              and ErrorMessage into a single convenient component.
 *              Every page uses this to avoid repeating the same
 *              loading/error/content conditional pattern.
 * @module components/common
 */

import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";

/**
 * PageWrapper component.
 *
 * Wraps page content and handles loading, error, and success states
 * with a single component. Eliminates boilerplate conditional rendering.
 *
 * @component
 * @param {Object}       props
 * @param {boolean}      props.loading     - Show spinner when true
 * @param {string}       props.error       - Show error message when truthy; pass error string directly
 * @param {function}     props.onRetry     - Callback for retry button passed to ErrorMessage
 * @param {string}       props.loadingMsg  - Message shown in spinner (default: "Loading...")
 * @param {string}       props.errorType   - Error style variant: 'error' or 'empty' (default: 'error')
 * @param {React.ReactNode} props.children - Page content shown when not loading/error
 * @returns {JSX.Element}
 *
 * @example
 * // Typical usage in a page component
 * export default function Dashboard() {
 *   const [loading, setLoading] = useState(true)
 *   const [error, setError] = useState("")
 *   const [data, setData] = useState(null)
 *
 *   async function fetchData() {
 *     setLoading(true)
 *     setError("")
 *     try {
 *       const res = await fetch('/api/dashboard')
 *       const json = await res.json()
 *       setData(json)
 *     } catch (err) {
 *       setError("Failed to load dashboard")
 *     } finally {
 *       setLoading(false)
 *     }
 *   }
 *
 *   useEffect(() => { fetchData() }, [])
 *
 *   return (
 *     <PageWrapper
 *       loading={loading}
 *       error={error}
 *       onRetry={fetchData}
 *       loadingMsg="Loading your dashboard..."
 *     >
 *       <div>
 *         <h1>Your Dashboard</h1>
 *         <p>{data.greeting}</p>
 *       </div>
 *     </PageWrapper>
 *   )
 * }
 */
export default function PageWrapper({
  loading,
  error,
  onRetry,
  loadingMsg = "Loading...",
  errorType = "error",
  children,
}) {
  // ── Conditional render logic ──
  // If loading, show spinner (takes priority over error)
  if (loading) {
    return <LoadingSpinner message={loadingMsg} />;
  }

  // If error message, show error state
  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={onRetry}
        type={errorType}
      />
    );
  }

  // Otherwise render the page content
  return children;
}
