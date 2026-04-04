"use client";

import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { fr } from "react-day-picker/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  name: string;
  defaultValue?: string; // YYYY-MM-DD
};

export function DatePicker({ name, defaultValue }: Props) {
  const initial = defaultValue ? new Date(defaultValue + "T12:00:00") : new Date();
  const [selected, setSelected] = useState<Date>(initial);

  const isoValue = [
    selected.getFullYear(),
    String(selected.getMonth() + 1).padStart(2, "0"),
    String(selected.getDate()).padStart(2, "0"),
  ].join("-");

  return (
    <div>
      <input type="hidden" name={name} value={isoValue} />
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={(date) => { if (date) setSelected(date); }}
        locale={fr}
        components={{
          PreviousMonthButton: (props) => (
            <button {...props} type="button" className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors">
              <ChevronLeft size={15} />
            </button>
          ),
          NextMonthButton: (props) => (
            <button {...props} type="button" className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors">
              <ChevronRight size={15} />
            </button>
          ),
        }}
        classNames={{
          root: "w-fit",
          months: "flex flex-col",
          month: "space-y-2",
          month_caption: "flex items-center justify-between px-1 h-8",
          caption_label: "text-sm font-semibold capitalize",
          nav: "flex items-center gap-1",
          month_grid: "w-full border-collapse",
          weekdays: "flex",
          weekday: "w-9 text-center text-xs text-muted-foreground font-normal pb-1",
          week: "flex",
          day: "w-9 h-9 p-0 text-center text-sm",
          day_button: [
            "w-9 h-9 rounded-md text-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
          ].join(" "),
          selected: "!bg-primary !text-primary-foreground rounded-md font-medium",
          today: "font-bold underline",
          outside: "opacity-30",
          disabled: "opacity-30 pointer-events-none",
          hidden: "invisible",
        }}
      />
    </div>
  );
}
