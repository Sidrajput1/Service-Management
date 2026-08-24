"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Building2, Check, MapPin, Users, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  useCreateProviderTechnician,
  useProviderServices,
  useProviderTechnicians,
  useSaveProviderServiceAreas,
  useSaveProviderServices,
} from "@/hooks/useProviderOnboarding";
import api from "@/lib/api";

const steps = [
  {
    key: "business",
    title: "Business",
    icon: Building2,
  },
  {
    key: "services",
    title: "Services",
    icon: Wrench,
  },
  {
    key: "areas",
    title: "Service Areas",
    icon: MapPin,
  },
  {
    key: "team",
    title: "Team",
    icon: Users,
  },
];

export default function ProviderOnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const { data: serviceData, isLoading: servicesLoading } =
    useProviderServices();

    console.log("service data is",serviceData)
  const saveServices = useSaveProviderServices();

  const [serviceAreas, setServiceAreas] = useState<string[]>([]);

  const [areaInput, setAreaInput] = useState("");

  const saveAreas = useSaveProviderServiceAreas();

  

  const [form, setForm] = useState<any>({
    companyName: "",
    businessType: "",
    description: "",
    email: "",
    phone: "",

    address: {
      addressLine: "",
      city: "",
      state: "",
      pincode: "",
      location: {
        type: "Point",
        coordinates: [0, 0],
      },
    },

    services: [],
    serviceAreas: [],
  });

  const [technicians, setTechnicians] =
  useState<any[]>([]);

const [technicianForm, setTechnicianForm] =
  useState({
    name: "",
    phone: "",
    email: "",
    skills: "",
    vehicleType: "",
  });

const createTechnician =
  useCreateProviderTechnician();

const {
  data: technicianData,
} = useProviderTechnicians();

console.log("tech data",technicianData)

// using useeffect load onboading
  useEffect(() => {
    loadOnboarding();
  }, []);

  // for checking servicedata
  useEffect(() => {
    if (serviceData?.selectedServiceIds) {
      setSelectedServices(serviceData.selectedServiceIds);
    }
  }, [serviceData]);

  // for technician data

  useEffect(() => {
  if (technicianData?.technicians) {
    setTechnicians(
      technicianData.technicians
    );
  }
}, [technicianData]);

  async function loadOnboarding() {
    try {
      const { data } = await axios.get("/api/service-provider/onboarding");

      if (data.onboardingComplete) {
        router.replace("/service-provider");
        return;
      }

      const provider = data.provider;

      setForm({
        companyName: provider.companyName || "",
        businessType: provider.businessType || "",
        description: provider.description || "",
        email: provider.email || "",
        phone: provider.phone || "",

        address: {
          addressLine: provider.address?.addressLine || "",
          city: provider.address?.city || "",
          state: provider.address?.state || "",
          pincode: provider.address?.pincode || "",
          location: provider.address?.location || {
            type: "Point",
            coordinates: [0, 0],
          },
        },

        services: provider.services || [],
        serviceAreas: provider.serviceAreas || [],
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function updateField(field: string, value: string) {
    setForm((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateAddress(field: string, value: string) {
    setForm((prev: any) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));
  }

  // Optionally set geo coordinates (from browser geolocation or map picker)
  function setAddressLocation(lat: number, lng: number) {
    setForm((prev: any) => ({
      ...prev,
      address: {
        ...prev.address,
        location: { type: "Point", coordinates: [lng, lat] },
      },
    }));
  }

  async function saveCurrentStep() {
    setSaving(true);

    try {
      // step 1
      if (step === 0) {
        await axios.put("/api/service-provider/onboarding", form);
      }
      // step -2
      if (step === 1) {
        await saveServices.mutateAsync(selectedServices);
      }

      // step - 3

      if (step === 2) {
        await saveAreas.mutateAsync(serviceAreas);
      }

      // Advance to the next step (capped at last step)
      setStep((current) => Math.min(current + 1, steps.length - 1));
    } catch (error: any) {
      alert(
        error?.response?.data?.error ||
          error?.message ||
          "Unable to save this step",
      );
    } finally {
      setSaving(false);
    }
  }

  async function completeOnboarding() {
    setSaving(true);

    try {
      //await api.put("/service-provider/onboarding", form);
      // save data seperately in step - 1,2,3

      await api.post("/service-provider/onboarding/complete");

      router.replace("/service-provider");
    } catch (error: any) {
      alert(error?.response?.data?.error || "Unable to complete onboarding");
    } finally {
      setSaving(false);
    }
  }

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        Loading onboarding...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <Card className="overflow-hidden rounded-3xl border-border/60">
          <div className="bg-linear-to-r from-slate-950 to-slate-800 px-6 py-8 text-white sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge className="mb-3 bg-white/10 text-white hover:bg-white/10">
                  Business Setup
                </Badge>

                <h1 className="text-3xl font-semibold tracking-tight">
                  Set up your service business
                </h1>

                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  Complete your profile so customers can discover and book your
                  services.
                </p>
              </div>

              <div className="text-sm text-slate-300">
                Step {step + 1} of {steps.length}
              </div>
            </div>

            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Step navigation */}
        <Card className="rounded-3xl border-border/60">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {steps.map((item, index) => {
                const Icon = item.icon;
                const active = index === step;
                const complete = index < step;

                return (
                  <div
                    key={item.key}
                    className={`flex items-center gap-3 rounded-2xl p-3 ${
                      active ? "bg-slate-950 text-white" : "bg-muted/50"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        active
                          ? "bg-white/10"
                          : complete
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-background"
                      }`}
                    >
                      {complete ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>

                    <div className="text-sm font-medium">{item.title}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main */}
        <Card className="rounded-3xl border-border/60 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            {step === 0 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold">Business profile</h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Tell customers about your company.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label>Company name</Label>
                    <Input
                      value={form.companyName}
                      onChange={(e) =>
                        updateField("companyName", e.target.value)
                      }
                      className="mt-2"
                      placeholder="CoolCare Services"
                    />
                  </div>

                  <div>
                    <Label>Business type</Label>
                    <Input
                      value={form.businessType}
                      onChange={(e) =>
                        updateField("businessType", e.target.value)
                      }
                      className="mt-2"
                      placeholder="Home services"
                    />
                  </div>

                  <div>
                    <Label>Business email</Label>
                    <Input
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Business phone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) =>
                        updateField("description", e.target.value)
                      }
                      className="mt-2 min-h-28"
                      placeholder="Tell customers what your business does..."
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold">Business address</h3>

                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label>Address</Label>
                      <Input
                        value={form.address.addressLine}
                        onChange={(e) =>
                          updateAddress("addressLine", e.target.value)
                        }
                        className="mt-2"
                        placeholder="Building, street, area"
                      />
                    </div>

                    <div>
                      <Label>City</Label>
                      <Input
                        value={form.address.city}
                        onChange={(e) => updateAddress("city", e.target.value)}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label>State</Label>
                      <Input
                        value={form.address.state}
                        onChange={(e) => updateAddress("state", e.target.value)}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label>Pincode</Label>
                      <Input
                        value={form.address.pincode}
                        onChange={(e) =>
                          updateAddress("pincode", e.target.value)
                        }
                        className="mt-2"
                      />
                    </div>

                    <div className="sm:col-span-2 mt-2">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!navigator?.geolocation) {
                              alert(
                                "Geolocation is not available in your browser",
                              );
                              return;
                            }
                            navigator.geolocation.getCurrentPosition(
                              (pos) => {
                                const lat = pos.coords.latitude;
                                const lng = pos.coords.longitude;
                                setAddressLocation(lat, lng);
                                alert(
                                  `Location set to [${lat.toFixed(5)}, ${lng.toFixed(5)}]`,
                                );
                              },
                              (err) => {
                                alert("Unable to get location: " + err.message);
                              },
                            );
                          }}
                        >
                          Use my current location
                        </Button>
                        <div className="text-sm text-muted-foreground">
                          (optional) set exact coordinates for map-based
                          searches
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold">Services</h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Select the services customers can book from your business.
                  </p>
                </div>

                <div className="rounded-2xl border border-dashed p-8 text-center">
                  <Wrench className="mx-auto h-8 w-8 text-muted-foreground" />

                  <h3 className="mt-3 font-medium">Service selection</h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    We'll connect this step to your Price Master next.
                  </p>
                </div>

                {servicesLoading ? (
                  <div className="text-sm text-muted-foreground">
                    Loading services...
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(serviceData?.services || []).map((service: any) => {
                      const selected = selectedServices.includes(
                        String(service._id),
                      );

                      return (
                        <button
                          key={service._id}
                          type="button"
                          onClick={() => {
                            const id = String(service._id);

                            setSelectedServices((current) =>
                              current.includes(id)
                                ? current.filter((item) => item !== id)
                                : [...current, id],
                            );
                          }}
                          className={`rounded-2xl border p-4 text-left transition ${
                            selected
                              ? "border-slate-950 bg-slate-950 text-white"
                              : "border-border bg-background hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium">{service.name}</div>

                              <div
                                className={`mt-1 text-sm ${
                                  selected
                                    ? "text-slate-300"
                                    : "text-muted-foreground"
                                }`}
                              >
                                ₹{service.price}
                              </div>
                            </div>

                            {selected && (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-950">
                                <Check className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
                  Selected services:{" "}
                  <span className="font-semibold text-foreground">
                    {selectedServices.length}
                  </span>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold">
                    Where do you provide services?
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Customers in these areas will be able to discover your
                    business.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={areaInput}
                    onChange={(e) => setAreaInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();

                        const value = areaInput.trim();

                        if (value && !serviceAreas.includes(value)) {
                          setServiceAreas((current) => [...current, value]);
                        }

                        setAreaInput("");
                      }
                    }}
                    placeholder="Enter city, area or pincode"
                  />

                  <Button
                    type="button"
                    onClick={() => {
                      const value = areaInput.trim();

                      if (value && !serviceAreas.includes(value)) {
                        setServiceAreas((current) => [...current, value]);
                      }

                      setAreaInput("");
                    }}
                  >
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {serviceAreas.map((area) => (
                    <Badge
                      key={area}
                      variant="secondary"
                      className="gap-2 rounded-full px-3 py-1.5"
                    >
                      {area}

                      <button
                        type="button"
                        onClick={() =>
                          setServiceAreas((current) =>
                            current.filter((item) => item !== area),
                          )
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>

                {serviceAreas.length === 0 && (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Add at least one city, area or pincode.
                  </div>
                )}
              </div>
            )}

           {step === 3 && (
  <div className="space-y-6">

    <div>
      <h2 className="text-xl font-semibold">
        Build your team
      </h2>

      <p className="mt-1 text-sm text-muted-foreground">
        Add technicians who will fulfill your customer bookings.
      </p>
    </div>

    <div className="grid gap-4 rounded-2xl border bg-muted/20 p-4 sm:grid-cols-2">

      <div>
        <Label>Name</Label>

        <Input
          className="mt-2"
          value={technicianForm.name}
          onChange={(e) =>
            setTechnicianForm({
              ...technicianForm,
              name: e.target.value,
            })
          }
          placeholder="Rahul Kumar"
        />
      </div>

      <div>
        <Label>Phone</Label>

        <Input
          className="mt-2"
          value={technicianForm.phone}
          onChange={(e) =>
            setTechnicianForm({
              ...technicianForm,
              phone: e.target.value,
            })
          }
          placeholder="9876543210"
        />
      </div>

      <div>
        <Label>Email</Label>

        <Input
          className="mt-2"
          value={technicianForm.email}
          onChange={(e) =>
            setTechnicianForm({
              ...technicianForm,
              email: e.target.value,
            })
          }
          placeholder="rahul@example.com"
        />
      </div>

      <div>
        <Label>Vehicle type</Label>

        <Input
          className="mt-2"
          value={
            technicianForm.vehicleType
          }
          onChange={(e) =>
            setTechnicianForm({
              ...technicianForm,
              vehicleType:
                e.target.value,
            })
          }
          placeholder="Bike / Car / Van"
        />
      </div>

      <div className="sm:col-span-2">
        <Label>Skills</Label>

        <Input
          className="mt-2"
          value={technicianForm.skills}
          onChange={(e) =>
            setTechnicianForm({
              ...technicianForm,
              skills: e.target.value,
            })
          }
          placeholder="AC Repair, AC Cleaning"
        />
      </div>

      <div className="sm:col-span-2">
        <Button
          type="button"
          onClick={async () => {
            const result =
              await createTechnician.mutateAsync({
                name: technicianForm.name,
                phone: technicianForm.phone,
                email:
                  technicianForm.email ||
                  undefined,
                vehicleType:
                  technicianForm.vehicleType,
                skills:
                  technicianForm.skills
                    .split(",")
                    .map(
                      (item) =>
                        item.trim()
                    )
                    .filter(Boolean),
              });
 
            // Immediately reflect the created technician in UI (optimistic local update)
            if (result?.technician) {
              const t = result.technician;
              const shaped = {
                _id: t.id || t._id,
                userId: {
                  name: t.name,
                  email: t.email,
                  phone: t.phone,
                },
                skills: t.skills || [],
                vehicleType: t.vehicleType || "",
                status: "offline",
              };

              setTechnicians((prev) => [shaped, ...prev]);
            }
 
            setTechnicianForm({
              name: "",
              phone: "",
              email: "",
              skills: "",
              vehicleType: "",
            });
 
            if (
              result.temporaryPassword
            ) {
              alert(
                `Technician created.\nTemporary password: ${result.temporaryPassword}`
              );
            }
          }}
          disabled={
            createTechnician.isPending
          }
        >
          {createTechnician.isPending
            ? "Adding..."
            : "Add Technician"}
        </Button>
      </div>

    </div>

    <div className="space-y-3">
      <h3 className="font-medium">
        Your technicians
      </h3>

      {technicians.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No technicians added yet.
        </div>
      ) : (
        technicians.map(
          (technician: any) => (
            <div
              key={technician._id}
              className="flex items-center justify-between rounded-2xl border p-4"
            >
              <div>
                <div className="font-medium">
                  {
                    technician.userId
                      ?.name
                  }
                </div>

                <div className="text-sm text-muted-foreground">
                  {
                    technician.userId
                      ?.phone
                  }
                </div>
              </div>

              <Badge>
                {technician.status}
              </Badge>
            </div>
          )
        )
      )}
    </div>

  </div>
)}

            {/* Footer */}
            <div className="mt-10 flex items-center justify-between border-t pt-6">
              <Button
                type="button"
                variant="outline"
                disabled={step === 0 || saving}
                onClick={() => setStep((current) => Math.max(0, current - 1))}
              >
                Back
              </Button>

              {step < steps.length - 1 ? (
                <Button
                  type="button"
                  disabled={saving}
                  onClick={saveCurrentStep}
                >
                  {saving ? "Saving..." : "Save & Continue"}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={saving}
                  onClick={completeOnboarding}
                >
                  {saving ? "Finishing..." : "Complete Setup"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
