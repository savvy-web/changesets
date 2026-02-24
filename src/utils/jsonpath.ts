/**
 * Minimal JSONPath get/set for version file updates.
 *
 * Supported syntax:
 * - `$.foo.bar` — nested property access
 * - `$.foo[*].bar` — array wildcard (iterate all elements)
 * - `$.foo[0].bar` — array index access
 *
 * @internal
 */

/** A single segment in a parsed JSONPath expression. */
export type Segment =
	| { readonly type: "property"; readonly key: string }
	| { readonly type: "index"; readonly index: number }
	| { readonly type: "wildcard" };

/**
 * Tokenize a JSONPath string into segments.
 *
 * @param path - JSONPath string (e.g., `"$.foo[*].bar"`)
 * @returns Array of path segments
 * @throws If the path doesn't start with `$.`
 */
export function parseJsonPath(path: string): Segment[] {
	if (!path.startsWith("$.")) {
		throw new Error(`Invalid JSONPath: must start with "$." — got "${path}"`);
	}

	const segments: Segment[] = [];
	const raw = path.slice(2); // strip "$."

	if (raw === "") {
		return segments;
	}

	// Split on `.` but preserve bracket expressions
	const tokens = raw.match(/[^.[\]]+|\[\*\]|\[\d+\]/g);

	if (!tokens) {
		throw new Error(`Invalid JSONPath: could not parse "${path}"`);
	}

	for (const token of tokens) {
		if (token === "[*]") {
			segments.push({ type: "wildcard" });
		} else if (token.startsWith("[") && token.endsWith("]")) {
			segments.push({ type: "index", index: Number.parseInt(token.slice(1, -1), 10) });
		} else {
			segments.push({ type: "property", key: token });
		}
	}

	return segments;
}

/**
 * Collect all values matching a JSONPath expression.
 *
 * @param obj - The object to query
 * @param path - JSONPath string
 * @returns Array of matched values
 */
export function jsonPathGet(obj: unknown, path: string): unknown[] {
	const segments = parseJsonPath(path);
	let current: unknown[] = [obj];

	for (const segment of segments) {
		const next: unknown[] = [];

		for (const node of current) {
			if (node === null || node === undefined || typeof node !== "object") {
				continue;
			}

			switch (segment.type) {
				case "property": {
					const value = (node as Record<string, unknown>)[segment.key];
					if (value !== undefined) {
						next.push(value);
					}
					break;
				}
				case "index": {
					if (Array.isArray(node) && segment.index < node.length) {
						next.push(node[segment.index]);
					}
					break;
				}
				case "wildcard": {
					if (Array.isArray(node)) {
						next.push(...node);
					}
					break;
				}
			}
		}

		current = next;
	}

	return current;
}

/**
 * Mutate all matching locations in an object.
 *
 * @param obj - The object to modify in-place
 * @param path - JSONPath string
 * @param value - The value to set at each matching location
 * @returns The number of locations updated
 */
export function jsonPathSet(obj: unknown, path: string, value: unknown): number {
	const segments = parseJsonPath(path);

	if (segments.length === 0) {
		return 0;
	}

	// Walk to the parent(s) of the final segment
	const lastSegment = segments[segments.length - 1];
	const parentSegments = segments.slice(0, -1);

	let parents: unknown[] = [obj];

	for (const segment of parentSegments) {
		const next: unknown[] = [];

		for (const node of parents) {
			if (node === null || node === undefined || typeof node !== "object") {
				continue;
			}

			switch (segment.type) {
				case "property": {
					const child = (node as Record<string, unknown>)[segment.key];
					if (child !== undefined) {
						next.push(child);
					}
					break;
				}
				case "index": {
					if (Array.isArray(node) && segment.index < node.length) {
						next.push(node[segment.index]);
					}
					break;
				}
				case "wildcard": {
					if (Array.isArray(node)) {
						next.push(...node);
					}
					break;
				}
			}
		}

		parents = next;
	}

	// Set value at the final segment on each parent
	let count = 0;

	for (const parent of parents) {
		if (parent === null || parent === undefined || typeof parent !== "object") {
			continue;
		}

		switch (lastSegment.type) {
			case "property": {
				if (lastSegment.key in (parent as Record<string, unknown>)) {
					(parent as Record<string, unknown>)[lastSegment.key] = value;
					count++;
				}
				break;
			}
			case "index": {
				if (Array.isArray(parent) && lastSegment.index < parent.length) {
					parent[lastSegment.index] = value;
					count++;
				}
				break;
			}
			case "wildcard": {
				if (Array.isArray(parent)) {
					for (let i = 0; i < parent.length; i++) {
						parent[i] = value;
						count++;
					}
				}
				break;
			}
		}
	}

	return count;
}
