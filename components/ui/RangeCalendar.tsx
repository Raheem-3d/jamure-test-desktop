"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays } from "date-fns";
import { getLocalTimeZone, today } from "@internationalized/date";
import { CalendarIcon } from "lucide-react";

type DateRange = { from?: Date; to?: Date };

type RangeCalendarPickerProps = {
  value: { startDate?: Date | string; endDate?: Date | string };
  onChange: (value: { startDate?: Date; endDate?: Date }) => void;
};

export function RangeCalendarPicker({ value, onChange }: RangeCalendarPickerProps) {
  const [range, setRange] = React.useState<DateRange>({
    from: value.startDate
      ? new Date(value.startDate)
      : today(getLocalTimeZone()).toDate(getLocalTimeZone()),
    to: value.endDate
      ? new Date(value.endDate)
      : addDays(today(getLocalTimeZone()).toDate(getLocalTimeZone()), 7),
  });

  const [open, setOpen] = React.useState(false);

  const formattedRange =
    range.from && range.to
      ? `${format(range.from, "MMM d, yyyy")} - ${format(range.to, "MMM d, yyyy")}`
      : "Select date range";

  return (
    <div >
      <button
        type="button"
        id="dueDateTrigger"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm"
      >
        {formattedRange}
        <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
      </button>

{open && (
  <div className="mt-2 rounded-md border p-2 w-full max-w-full overflow-auto">
    <Calendar
      mode="range"
      selected={range}
      onSelect={(selected) => {
        setRange(selected || {});
      }}
      numberOfMonths={1}
    />
    <button
      className="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
      onClick={() => {
        if (range.from && range.to) {
          onChange({
            startDate: range.from,
            endDate: range.to,
          });
          setOpen(false);
        }
      }}
    >
      Apply
    </button>
  </div>
)}

    </div>
  );
}
