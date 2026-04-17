"use client";
import { CheckCircle2, Circle, Clock3 } from 'lucide-react';
import React from 'react'

type TimelineStep = {
  key: string;
  label: string;
  done: boolean;
  active: boolean;
  date?: string;
  note?: string;
};

function BookingTimeline({steps}:{steps:TimelineStep[]}) {
  return (
   <div className="space-y-4">
      {steps.map((step, index) => (
        <div
          key={step.key}
          className={`flex gap-4 rounded-2xl border p-4 ${
            step.done
              ? "border-emerald-200 bg-emerald-50"
              : step.active
              ? "border-amber-200 bg-amber-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="mt-0.5">
            {step.done ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : step.active ? (
              <Clock3 className="h-5 w-5 text-amber-600" />
            ) : (
              <Circle className="h-5 w-5 text-slate-400" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium text-slate-900">{step.label}</div>
              <div className="text-xs text-slate-500">
                {step.date ? new Date(step.date).toLocaleString() : step.done ? "Done" : "Waiting"}
              </div>
            </div>

            {step.note ? (
              <p className="mt-1 text-sm text-slate-600">{step.note}</p>
            ) : null}

            {index < steps.length - 1 ? (
              <div className="mt-4 h-px w-full bg-slate-200" />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

export default BookingTimeline