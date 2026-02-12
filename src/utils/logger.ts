/**
 * Simple logging utility for changelog generation.
 *
 * Uses GitHub Actions `::warning::` annotation format in CI,
 * `console.warn` elsewhere.
 *
 */

/**
 * Log a warning message.
 *
 * In GitHub Actions, emits a `::warning::` annotation.
 * Otherwise falls back to `console.warn`.
 *
 * @param message - The warning message
 * @param args - Additional arguments
 *
 * @internal
 */
export function logWarning(message: string, ...args: unknown[]): void {
	/* v8 ignore start — environment-specific */
	if (typeof process !== "undefined" && process.env.GITHUB_ACTIONS === "true") {
		const text = args.length > 0 ? `${message} ${args.join(" ")}` : message;
		console.warn(`::warning::${text}`);
	} else {
		/* v8 ignore stop */
		console.warn(message, ...args);
	}
}
