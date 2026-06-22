"use client";

import * as React from "react";
import { Calendar } from "../../../app/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../../app/components/ui/popover";

export function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          ref={triggerRef} 
          onClick={() => setOpen(!open)} 
          aria-expanded={open}
          className="border p-2 rounded"
        >
          {value || "Pick a date"}
        </button>
      </PopoverTrigger>
      <PopoverContent onEscapeKeyDown={() => { setOpen(false); triggerRef.current?.focus(); }}>
        <Calendar 
          mode="single" 
          onSelect={(d) => { if(d) onChange(d.toISOString()); setOpen(false); triggerRef.current?.focus(); }} 
        />
      </PopoverContent>
    </Popover>
  );
}
