/**
 * @file index.js
 * @description Barrel export for common UI state components.
 *              Import from this file instead of individual component files.
 *
 * @example
 * // Instead of:
 * import LoadingSpinner from '../components/common/LoadingSpinner'
 * import ErrorMessage from '../components/common/ErrorMessage'
 * import PageWrapper from '../components/common/PageWrapper'
 *
 * // Use:
 * import { LoadingSpinner, ErrorMessage, PageWrapper } from '../components/common'
 */

export { default as LoadingSpinner } from "./LoadingSpinner";
export { default as ErrorMessage } from "./ErrorMessage";
export { default as PageWrapper } from "./PageWrapper";
