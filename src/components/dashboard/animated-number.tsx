"use client";

import { useEffect, useState } from "react";
import NumberFlow, { type Format } from "@number-flow/react";

interface AnimatedNumberProps {
 value: number;
 locales?: string | string[];
 format?: Format;
 className?: string;
}

export function AnimatedNumber({ value, locales, format, className }: AnimatedNumberProps) {
 const [display, setDisplay] = useState(0);

 useEffect(() => {
 const id = requestAnimationFrame(() => setDisplay(value));
 return () => cancelAnimationFrame(id);
 }, [value]);

 return <NumberFlow value={display} locales={locales} format={format} className={className} />;
}
