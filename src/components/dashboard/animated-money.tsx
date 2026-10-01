"use client";

import { useEffect, useState } from "react";
import NumberFlow from "@number-flow/react";

interface AnimatedMoneyProps {
 value: number;
 className?: string;
}

export function AnimatedMoney({ value, className }: AnimatedMoneyProps) {
 const [display, setDisplay] = useState(0);

 useEffect(() => {
 const id = requestAnimationFrame(() => setDisplay(value));
 return () => cancelAnimationFrame(id);
 }, [value]);

 return (
 <NumberFlow
 value={display}
 locales="id-ID"
 format={{
 style: "currency",
 currency: "IDR",
 maximumFractionDigits: 0,
 }}
 className={className}
 />
 );
}
