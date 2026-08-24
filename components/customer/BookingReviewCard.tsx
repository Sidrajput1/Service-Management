"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MessageSquareText, Star } from "lucide-react";

import api from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";

type BookingReviewCardProps = {
  bookingId: string;
  jobStatus: string;
};

function RatingSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            aria-label={`Rate ${rating} out of 5`}
            onClick={() => onChange(rating)}
            className="rounded-lg p-1 transition hover:bg-muted"
          >
            <Star
              className={`h-7 w-7 ${
                rating <= value
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BookingReviewCard({
  bookingId,
  jobStatus,
}: BookingReviewCardProps) {
  const [providerRating, setProviderRating] = useState(0);

  const [technicianRating, setTechnicianRating] = useState(0);

  const [comment, setComment] = useState("");

  const [existingReview, setExistingReview] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadReview() {
      try {
        const { data } = await api.get(
          `/customer/bookings/${bookingId}/review`,
        );

        setExistingReview(data?.review || null);
      } catch (error) {
        console.error("Load review:", error);
      } finally {
        setLoading(false);
      }
    }

    loadReview();
  }, [bookingId]);

  if (jobStatus !== "completed" || loading) {
    return null;
  }

  if (existingReview) {
    return (
      <Card className="rounded-2xl border-emerald-200 bg-emerald-50/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>

            <div>
              <p className="font-semibold text-emerald-800">
                Thanks for your feedback
              </p>

              <p className="mt-1 text-sm text-emerald-700">
                You already reviewed this service.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <RatingDisplay
              label="Technician"
              value={existingReview.technicianRating}
            />

            <RatingDisplay
              label="Service provider"
              value={existingReview.providerRating}
            />
          </div>

          {existingReview.comment && (
            <div className="mt-4 rounded-xl bg-white p-4 text-sm text-muted-foreground">
              "{existingReview.comment}"
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  async function submitReview() {
    if (providerRating < 1 || technicianRating < 1) {
      alert("Please rate both the technician and service provider.");
      return;
    }

    try {
      setSaving(true);

      const { data } = await api.post(
        `/customer/bookings/${bookingId}/review`,
        {
          providerRating,
          technicianRating,
          comment,
        },
      );

      setExistingReview(data.review);
    } catch (error: any) {
      alert(
        error?.response?.data?.error ||
          error?.message ||
          "Unable to submit review",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-2xl border-border/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareText className="h-5 w-5" />
          How was your service?
        </CardTitle>

        <p className="text-sm text-muted-foreground">
          Your feedback helps other customers choose trusted service providers
          and technicians.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <RatingSelector
          label="Rate your technician"
          value={technicianRating}
          onChange={setTechnicianRating}
        />

        <RatingSelector
          label="Rate the service provider"
          value={providerRating}
          onChange={setProviderRating}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Tell us about your experience
          </label>

          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="What went well? What could be better?"
            maxLength={1000}
            className="min-h-28 rounded-xl"
          />

          <p className="text-right text-xs text-muted-foreground">
            {comment.length}/1000
          </p>
        </div>

        <Button
          type="button"
          onClick={submitReview}
          disabled={saving}
          className="w-full rounded-xl"
        >
          <Star className="mr-2 h-4 w-4" />

          {saving ? "Submitting..." : "Submit review"}
        </Button>
      </CardContent>
    </Card>
  );
}

function RatingDisplay({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-xs text-muted-foreground">{label}</p>

      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <Star
            key={rating}
            className={`h-4 w-4 ${
              rating <= value
                ? "fill-amber-400 text-amber-400"
                : "text-slate-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
