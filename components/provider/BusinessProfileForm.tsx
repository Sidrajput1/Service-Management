"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Upload, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Feedback,
  errorMessage,
  ProviderHeading,
  ProviderState,
} from "./ProviderUi";
import { useProviderOnboarding } from "@/hooks/useProviderOnboarding";
import api from "@/lib/api";
import type { ProviderProfile } from "@/lib/marketplace-types";

function BusinessImageEditor({ provider }: { provider: ProviderProfile }) {
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [confirm, setConfirm] = useState(false);
  const client = useQueryClient(),
    input = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["provider-onboarding"] });
  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
    setFile(null);
    if (input.current) input.current.value = "";
  };
  return (
    <section className="provider-panel">
      <h2 className="font-semibold">Business logo or photo</h2>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">
        Optional. JPEG, PNG or WebP, up to 3 MB. Use an image you have
        permission to publish.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-5">
        <div className="relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
          {preview ? (
            <Image
              src={preview}
              alt="Selected business image preview"
              fill
              unoptimized
              sizes="112px"
              className="object-contain"
            />
          ) : provider.businessImage?.url ? (
            <Image
              src={provider.businessImage.url}
              alt={`${provider.companyName} business image`}
              fill
              sizes="112px"
              className="object-contain"
            />
          ) : (
            <Building2 className="size-10 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-3">
          <label htmlFor="business-image-file" className="provider-label">
            {provider.businessImage
              ? "Replace business image"
              : "Choose a business image"}
          </label>
          <input
            ref={input}
            id="business-image-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={pending}
            className="block max-w-full text-xs file:mr-3 file:rounded-lg file:border file:border-border file:bg-card file:px-3 file:py-2 file:text-foreground"
            onChange={(event) => {
              setError("");
              const selected = event.target.files?.[0];
              if (!selected) return;
              if (
                selected.size > 3 * 1024 * 1024 ||
                !["image/jpeg", "image/png", "image/webp"].includes(
                  selected.type,
                )
              ) {
                setError("Choose a JPEG, PNG or WebP image of at most 3 MB.");
                return;
              }
              if (preview) URL.revokeObjectURL(preview);
              setFile(selected);
              setPreview(URL.createObjectURL(selected));
            }}
          />
          <div className="flex flex-wrap gap-3">
            {file && (
              <>
                <Button
                  type="button"
                  className="h-11"
                  disabled={pending}
                  onClick={async () => {
                    if (!file) return;
                    setPending(true);
                    setError("");
                    try {
                      const body = new FormData();
                      body.set("file", file);
                      await api.post("/service-provider/business-image", body, {
                        headers: { "Content-Type": undefined },
                      });
                      reset();
                      await refresh();
                    } catch (failure) {
                      setError(errorMessage(failure));
                      await refresh();
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  <Upload className="size-4" />
                  {pending ? "Uploading…" : "Upload image"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  className="h-11"
                  onClick={reset}
                >
                  Discard selection
                </Button>
              </>
            )}
            {provider.businessImage && (
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={pending}
                onClick={() => setConfirm(true)}
              >
                <Trash2 className="size-4" />
                Remove image
              </Button>
            )}
          </div>
        </div>
      </div>
      <Feedback message={error} error />
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="w-[calc(100%_-_2rem)]! max-w-110! p-6">
          <DialogTitle>Remove your business image?</DialogTitle>
          <DialogDescription>
            Your provider cards will use a neutral business icon until you
            upload another image.
          </DialogDescription>
          <Button
            type="button"
            className="h-11"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await api.delete("/service-provider/business-image");
                setConfirm(false);
                await refresh();
              } catch (failure) {
                setError(errorMessage(failure));
                setConfirm(false);
              } finally {
                setPending(false);
              }
            }}
          >
            Remove image
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => setConfirm(false)}
          >
            Keep image
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
function ProfileEditor({ provider }: { provider: ProviderProfile }) {
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false);
  const client = useQueryClient();
  return (
    <div className="space-y-6">
      <BusinessImageEditor provider={provider} />
      <form
        className="provider-panel space-y-6"
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending) return;
          const fields = new FormData(event.currentTarget);
          setPending(true);
          setMessage("");
          setFailed(false);
          try {
            await api.put("/service-provider/onboarding", {
              companyName: fields.get("companyName"),
              businessType: fields.get("businessType"),
              description: fields.get("description"),
              email: fields.get("email"),
              phone: fields.get("phone"),
              address: {
                addressLine: fields.get("addressLine"),
                city: fields.get("city"),
                state: fields.get("state"),
                pincode: fields.get("pincode"),
              },
            });
            await client.invalidateQueries({
              queryKey: ["provider-onboarding"],
            });
            setMessage("Business details saved.");
          } catch (failure) {
            setFailed(true);
            setMessage(errorMessage(failure));
          } finally {
            setPending(false);
          }
        }}
      >
        <h2 className="font-semibold">Business information</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {(
            [
              {
                key: "companyName",
                label: "Business name",
                value: provider.companyName,
                type: "text",
              },
              {
                key: "businessType",
                label: "Business type",
                value: provider.businessType,
                type: "text",
              },
              {
                key: "email",
                label: "Business contact email",
                value: provider.email,
                type: "email",
              },
              {
                key: "phone",
                label: "Business phone",
                value: provider.phone,
                type: "tel",
              },
            ] as const
          ).map((field) => (
            <div key={field.key}>
              <label
                htmlFor={`business-${field.key}`}
                className="provider-label"
              >
                {field.label}
              </label>
              <Input
                id={`business-${field.key}`}
                name={field.key}
                type={field.type}
                required
                defaultValue={field.value || ""}
                maxLength={
                  field.key === "email" ? 254 : field.key === "phone" ? 20 : 120
                }
                className="h-12"
              />
            </div>
          ))}
        </div>
        <div>
          <label htmlFor="business-description" className="provider-label">
            About your business
          </label>
          <textarea
            id="business-description"
            name="description"
            maxLength={2000}
            rows={4}
            defaultValue={provider.description || ""}
            className="provider-textarea"
          />
        </div>
        <h2 className="border-t border-border pt-6 font-semibold">
          Business address
        </h2>
        <p className="text-xs leading-6 text-muted-foreground">
          This address identifies your business. Configure the places you serve
          separately in Service areas.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          {(
            [
              ["addressLine", "Street & building"],
              ["city", "City"],
              ["state", "State"],
              ["pincode", "PIN code"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`business-${key}`} className="provider-label">
                {label}
              </label>
              <Input
                id={`business-${key}`}
                name={key}
                defaultValue={provider.address?.[key] || ""}
                maxLength={
                  key === "pincode" ? 6 : key === "addressLine" ? 300 : 80
                }
                pattern={key === "pincode" ? "[1-9][0-9]{5}" : undefined}
                inputMode={key === "pincode" ? "numeric" : "text"}
                className="h-12"
              />
            </div>
          ))}
        </div>
        <Feedback message={message} error={failed} />
        <Button type="submit" disabled={pending} className="h-11 px-6">
          {pending ? "Saving…" : "Save business details"}
        </Button>
      </form>
    </div>
  );
}
export function BusinessProfileForm({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const query = useProviderOnboarding();
  return (
    <>
      {!embedded && (
        <ProviderHeading
          title="Business profile"
          description="Your business identity and public image, together. Contact changes here do not alter your login credentials."
        />
      )}
      <ProviderState
        loading={query.isLoading}
        error={query.isError}
        retry={() => query.refetch()}
      >
        {query.data && (
          <ProfileEditor
            key={query.data.provider.id}
            provider={query.data.provider}
          />
        )}
      </ProviderState>
    </>
  );
}
