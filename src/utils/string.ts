function normalized(value: unknown): string {
	return String(value ?? '').toLowerCase();
}

export function ilike(left: unknown, right: unknown): boolean {
	return normalized(left) === normalized(right);
}

export function anyIn_ci(needles: unknown | unknown[], haystack: unknown): boolean {
	const text = normalized(haystack);
	return (Array.isArray(needles) ? needles : [needles])
		.some(needle => text.includes(normalized(needle)));
}
