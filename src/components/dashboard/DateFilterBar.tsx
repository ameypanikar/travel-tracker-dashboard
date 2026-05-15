import { useState } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { startOfDay } from "@/lib/date-utils";

type Props = {
  value: Date | null;
  onChange: (d: Date | null) => void;
};

export function DateFilterBar({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3 flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-10 flex-1 justify-start gap-2 rounded-xl border-border bg-card text-left text-sm font-semibold text-accent shadow-card hover:bg-accent-soft",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="h-4 w-4" />
            {value ? (
              <span>Filtering: {format(value, "EEE, MMM d, yyyy")}</span>
            ) : (
              <span>Filter by date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ?? undefined}
            onSelect={(d) => {
              onChange(d ? startOfDay(d) : null);
              setOpen(false);
            }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          variant="outline"
          onClick={() => onChange(null)}
          className="h-10 rounded-xl border-border bg-card text-accent shadow-card hover:bg-accent-soft"
          aria-label="Clear date filter"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
