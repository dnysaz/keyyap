/**
 * KeyYap Security Utilities
 * HTML sanitization and escaping for XSS prevention.
 */

/**
 * Escapes HTML entities in user-generated content (posts, comments).
 * Must be called BEFORE applying any formatting regex (bold, links, mentions).
 * This ensures user content cannot inject arbitrary HTML or JavaScript.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Sanitizes admin-generated HTML content (e.g., from WYSIWYG rich text editor).
 * Strips dangerous tags and attributes while preserving safe formatting.
 * Used for site_settings content (terms, privacy, cookies policies).
 */
export function sanitizeAdminHtml(html: string): string {
  if (!html) return ''

  let sanitized = html

  // 1. Remove <script> tags and all their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // 2. Remove dangerous tags entirely (including content)
  sanitized = sanitized.replace(/<\/?(?:iframe|object|embed|form|input|button|textarea|select|meta|link|base|svg|math)\b[^>]*>/gi, '')

  // 3. Remove all event handler attributes (onclick, onerror, onload, onmouseover, etc.)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')

  // 4. Neutralize javascript:, data:, and vbscript: URLs in href/src/action attributes
  sanitized = sanitized.replace(/(href|src|action)\s*=\s*["']?\s*(?:javascript|data|vbscript)\s*:/gi, '$1="about:blank"')

  // 5. Remove CSS expressions that could execute JS (IE legacy, but still worth blocking)
  sanitized = sanitized.replace(/style\s*=\s*["'][^"']*expression\s*\([^"']*["']/gi, '')

  return sanitized
}
