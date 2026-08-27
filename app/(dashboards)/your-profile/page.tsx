"use client";

import { useEffect, useState } from "react";

import {
  Building2,
  Car,
  CheckCircle2,
  Edit3,
  FileText,
  LockKeyhole,
  MapPin,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
  Wrench,
  X,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";

import { Badge } from "@/components/ui/badge";

import { Separator } from "@/components/ui/separator";

import { toast } from "sonner";
import { useChangePassword, useProfile, useUpdateProfile } from "@/hooks/use-profile";

function getInitials(name?: string) {
  if (!name) return "U";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");
}

function roleLabel(role?: string) {
  switch (role) {
    case "service_provider":
      return "Service Provider";

    case "technician":
      return "Technician";

    case "customer":
      return "Customer";

    case "admin":
      return "Platform Admin";

    default:
      return role || "User";
  }
}

export default function ProfilePage() {
  const { data, isLoading } = useProfile();

  const updateProfile = useUpdateProfile();

  const changePassword = useChangePassword();

  const user = data?.user;

  const profile = data?.profile;

  const [editing, setEditing] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);

  const [form, setForm] = useState<any>({});

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!user) return;

    if (user.role === "service_provider") {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        companyName: profile?.companyName || "",
        businessType: profile?.businessType || "",
        description: profile?.description || "",
        serviceAreas: profile?.serviceAreas || [],
        address: profile?.address || {
          addressLine: "",
          city: "",
          state: "",
          pincode: "",
        },
      });

      return;
    }

    if (user.role === "technician") {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        skills: profile?.skills || [],
        vehicleType: profile?.vehicleType || "",
      });

      return;
    }

    if (user.role === "customer") {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        notes: profile?.notes || "",
        addresses: profile?.addresses || [],
      });

      return;
    }

    setForm({
      name: user.name || "",
      phone: user.phone || "",
    });
  }, [user, profile]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="h-40 animate-pulse rounded-3xl bg-muted" />
          <div className="h-96 animate-pulse rounded-3xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="p-6">Unable to load profile.</div>;
  }

  async function saveProfile() {
    try {
      const payload: any = {
        name: form.name,
        phone: form.phone,
      };

      if (user.role === "customer") {
        payload.notes = form.notes;

        payload.addresses = form.addresses;
      }

      if (user.role === "technician") {
        payload.skills = form.skills;

        payload.vehicleType = form.vehicleType;
      }

      if (user.role === "service_provider") {
        payload.companyName = form.companyName;

        payload.businessType = form.businessType;

        payload.description = form.description;

        payload.serviceAreas = form.serviceAreas;

        payload.address = form.address;
      }

      await updateProfile.mutateAsync(payload);

      setEditing(false);

      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          "Unable to update profile",
      );
    }
  }

  async function savePassword() {
    try {
      await changePassword.mutateAsync(passwordForm);

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setPasswordOpen(false);

      toast.success("Password changed successfully");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          "Unable to change password",
      );
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <Card className="overflow-hidden rounded-3xl border-border/70 bg-card shadow-sm">
          <CardContent className="relative p-6 sm:p-8">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-coral/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-brand-coral to-brand-teal text-xl font-semibold text-white shadow-lg shadow-brand-coral/20">
                  {getInitials(user.name)}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-poppins text-2xl font-semibold tracking-tight text-foreground">
                      {user.name || "Your Profile"}
                    </h1>

                    <Badge className="rounded-full border-brand-coral/20 bg-brand-coral/10 text-brand-coral hover:bg-brand-coral/10">
                      {roleLabel(user.role)}
                    </Badge>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Manage your account and profile information.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {!editing ? (
                  <Button
                    className="rounded-xl"
                    onClick={() => setEditing(true)}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit profile
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => setEditing(false)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>

                    <Button
                      className="rounded-xl"
                      onClick={saveProfile}
                      disabled={updateProfile.isPending}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {updateProfile.isPending ? "Saving..." : "Save changes"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="rounded-3xl border-border/70 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Account information</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoField
                icon={<User className="h-4 w-4" />}
                label="Name"
                value={
                  editing ? (
                    <Input
                      value={form.name || ""}
                      onChange={(event) =>
                        setForm((current: any) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="rounded-xl"
                    />
                  ) : (
                    user.name || "-"
                  )
                }
              />

              <InfoField
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {user.email || "-"}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Email is managed by your account authentication.
                    </p>
                  </div>
                }
              />

              <InfoField
                icon={<Phone className="h-4 w-4" />}
                label="Phone"
                value={
                  editing ? (
                    <Input
                      value={form.phone || ""}
                      onChange={(event) =>
                        setForm((current: any) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      className="rounded-xl"
                    />
                  ) : (
                    user.phone || "Not added"
                  )
                }
              />

              <InfoField
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Account type"
                value={
                  <Badge variant="secondary" className="rounded-full">
                    {roleLabel(user.role)}
                  </Badge>
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Provider */}
        {user.role === "service_provider" && (
          <ProviderProfile
            profile={profile}
            form={form}
            setForm={setForm}
            editing={editing}
          />
        )}

        {/* Technician */}
        {user.role === "technician" && (
          <TechnicianProfile
            profile={profile}
            form={form}
            setForm={setForm}
            editing={editing}
          />
        )}

        {/* Customer */}
        {user.role === "customer" && (
          <CustomerProfile
            profile={profile}
            form={form}
            setForm={setForm}
            editing={editing}
          />
        )}

        {/* Security */}
        <Card className="rounded-3xl border-border/70 bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Security</CardTitle>

                <p className="mt-1 text-sm text-muted-foreground">
                  Keep your Servizato account secure.
                </p>
              </div>

              <LockKeyhole className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>

          <CardContent>
            {!passwordOpen ? (
              <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">Password</p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Change your account password anytime.
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setPasswordOpen(true)}
                >
                  Change password
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-5">
                <div className="grid gap-4">
                  <PasswordField
                    label="Current password"
                    value={passwordForm.currentPassword}
                    onChange={(value) =>
                      setPasswordForm((current) => ({
                        ...current,
                        currentPassword: value,
                      }))
                    }
                  />

                  <PasswordField
                    label="New password"
                    value={passwordForm.newPassword}
                    onChange={(value) =>
                      setPasswordForm((current) => ({
                        ...current,
                        newPassword: value,
                      }))
                    }
                  />

                  <PasswordField
                    label="Confirm new password"
                    value={passwordForm.confirmPassword}
                    onChange={(value) =>
                      setPasswordForm((current) => ({
                        ...current,
                        confirmPassword: value,
                      }))
                    }
                  />
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      setPasswordOpen(false);

                      setPasswordForm({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    className="rounded-xl"
                    onClick={savePassword}
                    disabled={changePassword.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {changePassword.isPending
                      ? "Updating..."
                      : "Update password"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>

      <div className="mt-2 text-sm text-foreground">{value}</div>
    </div>
  );
}

function ProviderProfile({ profile, form, setForm, editing }: any) {
  const address = form.address || {};

  return (
    <Card className="rounded-3xl border-border/70 bg-card shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
            <Building2 className="h-5 w-5" />
          </div>

          <div>
            <CardTitle>Business profile</CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Your service business information.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <EditableField
            label="Company name"
            value={editing ? form.companyName : profile?.companyName || "-"}
            editing={editing}
            onChange={(value) =>
              setForm((current: any) => ({
                ...current,
                companyName: value,
              }))
            }
          />

          <EditableField
            label="Business type"
            value={editing ? form.businessType : profile?.businessType || "-"}
            editing={editing}
            onChange={(value) =>
              setForm((current: any) => ({
                ...current,
                businessType: value,
              }))
            }
          />
        </div>

        <EditableField
          label="Description"
          value={
            editing
              ? form.description
              : profile?.description || "No description added."
          }
          editing={editing}
          multiline
          onChange={(value) =>
            setForm((current: any) => ({
              ...current,
              description: value,
            }))
          }
        />

        <Separator />

        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Business address
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <EditableField
              label="Address"
              value={
                editing
                  ? address.addressLine
                  : profile?.address?.addressLine || "-"
              }
              editing={editing}
              onChange={(value) =>
                setForm((current: any) => ({
                  ...current,
                  address: {
                    ...current.address,
                    addressLine: value,
                  },
                }))
              }
            />

            <EditableField
              label="City"
              value={editing ? address.city : profile?.address?.city || "-"}
              editing={editing}
              onChange={(value) =>
                setForm((current: any) => ({
                  ...current,
                  address: {
                    ...current.address,
                    city: value,
                  },
                }))
              }
            />

            <EditableField
              label="State"
              value={editing ? address.state : profile?.address?.state || "-"}
              editing={editing}
              onChange={(value) =>
                setForm((current: any) => ({
                  ...current,
                  address: {
                    ...current.address,
                    state: value,
                  },
                }))
              }
            />

            <EditableField
              label="Pincode"
              value={
                editing ? address.pincode : profile?.address?.pincode || "-"
              }
              editing={editing}
              onChange={(value) =>
                setForm((current: any) => ({
                  ...current,
                  address: {
                    ...current.address,
                    pincode: value,
                  },
                }))
              }
            />
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-sm font-semibold text-foreground">
            Marketplace status
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              {profile?.status || "active"}
            </Badge>

            <Badge className="rounded-full border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400">
              {profile?.verificationStatus || "pending"}
            </Badge>
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-sm font-semibold text-foreground">Service areas</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {(profile?.serviceAreas || form.serviceAreas || []).map(
              (area: string, index: number) => (
                <Badge
                  key={`${area}-${index}`}
                  variant="secondary"
                  className="rounded-full"
                >
                  {area}
                </Badge>
              ),
            )}

            {!profile?.serviceAreas?.length && (
              <span className="text-sm text-muted-foreground">
                No service areas configured.
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TechnicianProfile({ profile, form, setForm, editing }: any) {
  return (
    <Card className="rounded-3xl border-border/70 bg-card shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Wrench className="h-5 w-5" />
          </div>

          <div>
            <CardTitle>Technician profile</CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Your professional information and work profile.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <EditableField
            label="Vehicle type"
            value={
              editing
                ? form.vehicleType
                : profile?.vehicleType || "Not specified"
            }
            editing={editing}
            onChange={(value) =>
              setForm((current: any) => ({
                ...current,
                vehicleType: value,
              }))
            }
          />

          <InfoField
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Work status"
            value={
              <Badge className="rounded-full">
                {profile?.status || "offline"}
              </Badge>
            }
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoField
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Jobs completed"
            value={profile?.jobsCompleted || 0}
          />

          <InfoField
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Rating"
            value={
              profile?.rating
                ? `${profile.rating.toFixed(1)} / 5`
                : "No ratings yet"
            }
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">Skills</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {(profile?.skills || []).map((skill: string, index: number) => (
              <Badge
                key={`${skill}-${index}`}
                variant="secondary"
                className="rounded-full"
              >
                {skill}
              </Badge>
            ))}

            {!profile?.skills?.length && (
              <span className="text-sm text-muted-foreground">
                No skills added.
              </span>
            )}
          </div>
        </div>

        {profile?.serviceProviderId?.companyName && (
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Service provider
            </p>

            <p className="mt-1 font-medium text-foreground">
              {profile.serviceProviderId.companyName}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CustomerProfile({ profile, form, setForm, editing }: any) {
  return (
    <Card className="rounded-3xl border-border/70 bg-card shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-coral/10 text-brand-coral">
            <User className="h-5 w-5" />
          </div>

          <div>
            <CardTitle>Customer profile</CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Manage your customer information and saved addresses.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <EditableField
          label="Notes"
          value={editing ? form.notes : profile?.notes || "No notes added."}
          editing={editing}
          multiline
          onChange={(value) =>
            setForm((current: any) => ({
              ...current,
              notes: value,
            }))
          }
        />

        <div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Saved addresses
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Your saved service locations.
              </p>
            </div>

            <Badge variant="secondary" className="rounded-full">
              {(profile?.addresses || []).length}
            </Badge>
          </div>

          <div className="mt-4 space-y-3">
            {(profile?.addresses || []).map((address: any, index: number) => (
              <div
                key={index}
                className="rounded-2xl border border-border/70 bg-muted/20 p-4"
              >
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />

                  <div>
                    <p className="font-medium text-foreground">
                      {address.label || "Address"}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {address.addressLine || "-"}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {address.city || ""}
                      {address.state ? `, ${address.state}` : ""}
                      {address.pincode ? ` - ${address.pincode}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {!profile?.addresses?.length && (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                <MapPin className="mx-auto h-5 w-5 text-muted-foreground" />

                <p className="mt-2 text-sm text-muted-foreground">
                  No saved addresses yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EditableField({
  label,
  value,
  editing,
  multiline = false,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>

      {editing ? (
        multiline ? (
          <Textarea
            value={value || ""}
            onChange={(event) => onChange(event.target.value)}
            className="min-h-24 rounded-xl"
          />
        ) : (
          <Input
            value={value || ""}
            onChange={(event) => onChange(event.target.value)}
            className="rounded-xl"
          />
        )
      ) : (
        <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-sm text-foreground">
          {value || "-"}
        </div>
      )}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <Input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl"
      />
    </div>
  );
}
