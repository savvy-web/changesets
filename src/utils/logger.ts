/**
 * Simple logging utility for changelog generation.
 *
 * Uses GitHub Actions `::warning::` annotation format in CI,
 * `console.warn` elsewhere. Suppressed automatically during tests
 * (detected via `process.env.VITEST`).
 *
 */

/**
 * Log a warning message.
 *
 * In GitHub Actions, emits a `::warning::` annotation.
 * Otherwise falls back to `console.warn`.
 * Suppressed when running under Vitest.
 *
 * @param message - The warning message
 * @param args - Additional arguments
 *
 * @internal
 */
export function logWarning(message: string, ...args: unknown[]): void {
	/* v8 ignore start — environment-specific */
	if (typeof process !== "undefined" && process.env.VITEST) {
		return;
	}
	if (typeof process !== "undefined" && process.env.GITHUB_ACTIONS === "true") {
		const text = args.length > 0 ? `${message} ${args.join(" ")}` : message;
		console.warn(`::warning::${text}`);
	} else {
		/* v8 ignore stop */
		console.warn(message, ...args);
	}
}
