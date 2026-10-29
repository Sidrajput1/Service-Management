"use client";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, MapPin, Trash2, Save } from "lucide-react";
import { useCustomerMe, useUpdateCustomerProfile } from "@/hooks/useCustomer";
import { CustomerPageHeading, CustomerState } from "./CustomerUi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Address, CustomerProfile } from "@/lib/customer-types";
type ProfileValues = {
  name: string;
  phone: string;
  email: string;
  addresses: Address[];
};
function ProfileForm({ profile }: { profile: CustomerProfile["customer"] }) {
  const mutation = useUpdateCustomerProfile();
  const [feedback, setFeedback] = useState("");
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileValues>({
    defaultValues: {
      name: profile.name || "",
      phone: profile.phone || "",
      email: profile.email || "",
      addresses: profile.addresses || [],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses",
  });
  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        setFeedback("");
        try {
          await mutation.mutateAsync(values);
          setFeedback("Your contact details and addresses have been saved.");
        } catch {
          setFeedback("Your changes weren’t saved. Please try again.");
        }
      })}
      className="space-y-6"
    >
      <section className="customer-panel">
        <h2 className="font-display text-lg font-semibold">Contact details</h2>
        <p className="mb-6 mt-2 text-xs leading-6 text-muted-foreground">
          These details are used for service visits. Updating a contact email
          here does not change your login email.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            { key: "name", label: "Full name", type: "text" },
            { key: "phone", label: "Phone number", type: "tel" },
            { key: "email", label: "Contact email", type: "email" },
          ].map((field) => (
            <div key={field.key}>
              <label
                htmlFor={`profile-${field.key}`}
                className="mb-2 block text-xs font-semibold"
              >
                {field.label}
              </label>
              <Input
                id={`profile-${field.key}`}
                type={field.type}
                className="h-12"
                {...register(field.key as "name" | "phone" | "email", {
                  required:
                    field.key === "name" ? "Your name is required" : false,
                  maxLength:
                    field.key === "name"
                      ? 100
                      : field.key === "phone"
                        ? 20
                        : 254,
                })}
              />
              {field.key === "name" && errors.name && (
                <p role="alert" className="mt-2 text-xs text-primary">
                  {errors.name.message}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="customer-panel">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">
            Saved addresses
          </h2>
          <Button
            variant="outline"
            className="h-11 px-4"
            type="button"
            disabled={fields.length >= 10}
            onClick={() =>
              append({
                label: "Home",
                addressLine: "",
                city: "",
                state: "",
                pincode: "",
              })
            }
          >
            <Plus className="size-4" />
            Add address
          </Button>
        </div>
        {!fields.length && (
          <p className="text-sm leading-7 text-muted-foreground">
            Save an address for your next service visit.
          </p>
        )}
        <div className="space-y-5">
          {fields.map((field, index) => (
            <fieldset
              key={field.id}
              className="rounded-2xl border border-border bg-muted/20 p-5"
            >
              <legend className="px-2 text-xs font-bold">
                <MapPin className="mr-1 inline size-3.5" />
                Address {index + 1}
              </legend>
              <div className="mb-4 flex justify-end">
                <Button
                  variant="ghost"
                  type="button"
                  className="size-11"
                  aria-label={`Remove address ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["label", "Label"],
                    ["addressLine", "House, street & area"],
                    ["city", "City"],
                    ["state", "State"],
                    ["locality", "Locality"],
                    ["pincode", "Pincode"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label
                      className="mb-2 block text-xs font-semibold"
                      htmlFor={`address-${index}-${key}`}
                    >
                      {label}
                    </label>
                    <Input
                      className="h-11"
                      id={`address-${index}-${key}`}
                      {...register(`addresses.${index}.${key}`, {
                        required: ["addressLine", "city", "pincode"].includes(
                          key,
                        )
                          ? "This field is required"
                          : false,
                        maxLength:
                          key === "addressLine"
                            ? 300
                            : key === "label"
                              ? 50
                              : key === "pincode"
                                ? 6
                                : 100,
                        ...(key === "pincode"
                          ? {
                              pattern: {
                                value: /^\d{6}$/,
                                message: "Enter a six-digit pincode",
                              },
                            }
                          : {}),
                      })}
                    />
                    {key === "pincode" &&
                      errors.addresses?.[index]?.pincode && (
                        <p className="mt-2 text-xs text-primary">
                          {errors.addresses[index]?.pincode?.message}
                        </p>
                      )}
                  </div>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </section>
      {feedback && (
        <p
          role={mutation.isError ? "alert" : "status"}
          className={`rounded-xl border border-border p-4 text-sm ${mutation.isError ? "text-primary" : "text-secondary-foreground"}`}
        >
          {feedback}
        </p>
      )}
      <Button
        type="submit"
        disabled={mutation.isPending}
        className="public-button public-button-primary"
      >
        <Save className="size-4" />
        {mutation.isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
export function CustomerAccountView() {
  const query = useCustomerMe();
  const data = query.data as CustomerProfile | undefined;
  return (
    <>
      <CustomerPageHeading
        eyebrow="A PLACE FOR THE EVERYDAY"
        title="My account"
        description="Keep your contact information and service addresses up to date."
      />
      <CustomerState
        loading={query.isLoading}
        error={query.isError}
        retry={() => query.refetch()}
      >
        {data && (
          <ProfileForm
            key={data.customer ? "profile" : "empty"}
            profile={data.customer}
          />
        )}
      </CustomerState>
    </>
  );
}
