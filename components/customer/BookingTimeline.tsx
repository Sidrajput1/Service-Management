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
              ? "border-brand-teal/20 bg-secondary/60"
              : step.active
              ? "border-primary/20 bg-primary/5"
              : "border-border bg-card"
          }`}
        >
          <div className="mt-0.5">
            {step.done ? (
              <CheckCircle2 className="h-5 w-5 text-brand-teal-dark" />
            ) : step.active ? (
              <Clock3 className="h-5 w-5 text-primary" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium text-foreground">{step.label}</div>
              <div className="text-xs text-muted-foreground">
                {step.date ? new Date(step.date).toLocaleString() : step.done ? "Done" : "Waiting"}
              </div>
            </div>

            {step.note ? (
              <p className="mt-1 text-sm text-muted-foreground">{step.note}</p>
            ) : null}

            {index < steps.length - 1 ? (
              <div className="mt-4 h-px w-full bg-border" />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

export default BookingTimeline