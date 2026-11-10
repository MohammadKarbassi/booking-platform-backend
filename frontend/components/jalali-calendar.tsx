"use client";

import * as jalali from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import { Calendar } from "@/components/ui/calendar";

// DayPicker does its month maths through `dateLib`; swapping in date-fns-jalali turns the grid into the Jalali calendar.
const jalaliLib = {
  addDays: jalali.addDays,
  addMonths: jalali.addMonths,
  addWeeks: jalali.addWeeks,
  addYears: jalali.addYears,
  differenceInCalendarDays: jalali.differenceInCalendarDays,
  differenceInCalendarMonths: jalali.differenceInCalendarMonths,
  eachMonthOfInterval: jalali.eachMonthOfInterval,
  eachYearOfInterval: jalali.eachYearOfInterval,
  endOfISOWeek: jalali.endOfISOWeek,
  endOfMonth: jalali.endOfMonth,
  endOfWeek: jalali.endOfWeek,
  endOfYear: jalali.endOfYear,
  format: jalali.format,
  getISOWeek: jalali.getISOWeek,
  getMonth: jalali.getMonth,
  getYear: jalali.getYear,
  getWeek: jalali.getWeek,
  isAfter: jalali.isAfter,
  isBefore: jalali.isBefore,
  isDate: jalali.isDate,
  isSameDay: jalali.isSameDay,
  isSameMonth: jalali.isSameMonth,
  isSameYear: jalali.isSameYear,
  max: jalali.max,
  min: jalali.min,
  setMonth: jalali.setMonth,
  setYear: jalali.setYear,
  startOfDay: jalali.startOfDay,
  startOfISOWeek: jalali.startOfISOWeek,
  startOfMonth: jalali.startOfMonth,
  startOfWeek: jalali.startOfWeek,
  startOfYear: jalali.startOfYear,
  newDate: jalali.newDate,
};

export function JalaliCalendar(props: React.ComponentProps<typeof Calendar>) {
  return (
    <Calendar
      dir="rtl"
      locale={faIR}
      numerals="arabext"
      weekStartsOn={6}
      dateLib={jalaliLib as React.ComponentProps<typeof Calendar>["dateLib"]}
      {...props}
    />
  );
}
