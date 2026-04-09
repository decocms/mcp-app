import { useEffect, useRef, useState } from "react";

interface UseTypewriterOptions {
	speed?: number;
	enabled?: boolean;
}

interface UseTypewriterReturn {
	displayText: string;
	isAnimating: boolean;
}

export function useTypewriter(
	text: string,
	options: UseTypewriterOptions = {},
): UseTypewriterReturn {
	const { speed = 20, enabled = true } = options;
	const [charIndex, setCharIndex] = useState(0);
	const [isAnimating, setIsAnimating] = useState(false);
	const previousTextRef = useRef(text);

	useEffect(() => {
		if (!enabled || text === previousTextRef.current) {
			setCharIndex(text.length);
			setIsAnimating(false);
			previousTextRef.current = text;
			return;
		}

		previousTextRef.current = text;
		setCharIndex(0);
		setIsAnimating(true);

		const interval = setInterval(() => {
			setCharIndex((prev) => {
				if (prev >= text.length) {
					clearInterval(interval);
					setIsAnimating(false);
					return text.length;
				}
				return prev + 1;
			});
		}, speed);

		return () => clearInterval(interval);
	}, [text, enabled, speed]);

	return {
		displayText: isAnimating ? text.slice(0, charIndex) : text,
		isAnimating,
	};
}
