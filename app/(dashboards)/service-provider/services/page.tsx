"use client";

import { useMemo, useState } from "react";
import {
  BadgePercent,
  Check,
  ChevronRight,
  Edit3,
  MoreHorizontal,
  Pause,
  Plus,
  Search,
  Tag,
  TrendingDown,
  Wrench,
  X,
} from "lucide-react";

import { toast } from "sonner";

import {
  useCreateProviderServiceOffering,
  useDisableProviderServiceOffering,
  useProviderServiceOfferings,
  useUpdateProviderServiceOffering,
} from "@/hooks/useProviderServiceOfferings";

import {
  useProviderServiceCatalog,
  type PriceItem,
} from "@/hooks/useProviderServiceCatalog";

import {
  calculateOfferingPrice,
} from "@/lib/service-offering-price-client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type FormState = {
  priceItemId: string;

  price: string;
  taxPercent: string;
  description: string;

  offerEnabled: boolean;
  offerName: string;

  discountType: "percentage" | "flat";
  discountValue: string;

  offerStartsAt: string;
  offerEndsAt: string;
};

const emptyForm: FormState = {
  priceItemId: "",

  price: "",
  taxPercent: "18",
  description: "",

  offerEnabled: false,
  offerName: "",

  discountType: "percentage",
  discountValue: "",

  offerStartsAt: "",
  offerEndsAt: "",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getServiceId(
  priceItemId:
    | string
    | {
        _id: string;
      }
) {
  if (typeof priceItemId === "string") {
    return priceItemId;
  }

  return priceItemId._id;
}

function formatDate(date?: string) {
  if (!date) return "";

  return new Date(date).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

export default function ProviderServicesPage() {
  const {
    data: offeringData,
    isLoading: offeringsLoading,
  } = useProviderServiceOfferings();

  const {
    data: catalogData,
    isLoading: catalogLoading,
  } = useProviderServiceCatalog();

  const createOffering =
    useCreateProviderServiceOffering();

  const updateOffering =
    useUpdateProviderServiceOffering();

  const disableOffering =
    useDisableProviderServiceOffering();

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [editingOffering, setEditingOffering] =
    useState<any | null>(null);

  const [search, setSearch] =
    useState("");

  const [form, setForm] =
    useState<FormState>(emptyForm);

  const offerings =
    offeringData?.offerings || [];

  const catalog =
    catalogData?.services || [];

//   const usedPriceItemIds = useMemo(() => {
//     return new Set(
//       offerings.map((offering) =>
//         getServiceId(
//           offering.priceItemId
//         )
//       )
//     );
//   }, [offerings]);
const usedPriceItemIds = useMemo(() => {
  return new Set(
    offerings
      .filter((offering) => offering.isActive)
      .map((offering) =>
        getServiceId(offering.priceItemId)
      )
  );
}, [offerings]);

  const availableCatalogServices =
    catalog.filter(
      (service) =>
        !usedPriceItemIds.has(
          service._id
        )
    );

  const filteredOfferings =
    offerings.filter((offering) =>
      offering.name
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  const activeCount = offerings.filter(
    (offering) =>
      offering.isActive
  ).length;

  const offerCount = offerings.filter(
    (offering) =>
      offering.offerEnabled
  ).length;

  const averagePrice =
    offerings.length > 0
      ? offerings.reduce(
          (total, offering) =>
            total +
            Number(offering.price || 0),
          0
        ) / offerings.length
      : 0;

  const selectedCatalogService =
    catalog.find(
      (item) =>
        item._id ===
        form.priceItemId
    );

  const previewPricing =
    calculateOfferingPrice(
      Number(form.price || 0),
      form.offerEnabled,
      form.discountType,
      Number(form.discountValue || 0)
    );

  function openCreateDialog() {
    setEditingOffering(null);

    setForm({
      ...emptyForm,
      taxPercent: "18",
    });

    setDialogOpen(true);
  }

  function openEditDialog(
    offering: any
  ) {
    setEditingOffering(offering);

    setForm({
      priceItemId:
        getServiceId(
          offering.priceItemId
        ),

      price: String(
        offering.price ?? ""
      ),

      taxPercent: String(
        offering.taxPercent ?? 18
      ),

      description:
        offering.description || "",

      offerEnabled:
        Boolean(
          offering.offerEnabled
        ),

      offerName:
        offering.offerName || "",

      discountType:
        offering.discountType ||
        "percentage",

      discountValue:
        String(
          offering.discountValue ??
            ""
        ),

      offerStartsAt:
        offering.offerStartsAt
          ? new Date(
              offering.offerStartsAt
            )
              .toISOString()
              .slice(0, 10)
          : "",

      offerEndsAt:
        offering.offerEndsAt
          ? new Date(
              offering.offerEndsAt
            )
              .toISOString()
              .slice(0, 10)
          : "",
    });

    setDialogOpen(true);
  }

  function updateForm(
    patch: Partial<FormState>
  ) {
    setForm((current) => ({
      ...current,
      ...patch,
    }));
  }

  function selectCatalogService(
    serviceId: string
  ) {
    const selected =
      catalog.find(
        (service) =>
          service._id === serviceId
      );

    if (!selected) return;

    updateForm({
      priceItemId: serviceId,

      /*
       * Give provider the platform price
       * as a starting suggestion.
       *
       * They can change it freely.
       */
      price: String(
        selected.price ?? 0
      ),

      taxPercent: String(
        selected.taxPercent ?? 18
      ),
    });
  }

  async function handleSave() {
    if (!form.priceItemId) {
      toast.error(
        "Please select a service"
      );
      return;
    }

    const price =
      Number(form.price);

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      toast.error(
        "Enter a valid service price"
      );
      return;
    }

    if (
      form.offerEnabled &&
      !form.offerName.trim()
    ) {
      toast.error(
        "Enter an offer name"
      );
      return;
    }

    if (
      form.offerEnabled &&
      !form.discountValue
    ) {
      toast.error(
        "Enter a discount value"
      );
      return;
    }

    const discountValue =
      Number(form.discountValue);

    if (
      form.offerEnabled &&
      form.discountType ===
        "percentage" &&
      discountValue > 100
    ) {
      toast.error(
        "Percentage discount cannot exceed 100%"
      );
      return;
    }

    if (
      form.offerEnabled &&
      form.discountType === "flat" &&
      discountValue > price
    ) {
      toast.error(
        "Flat discount cannot exceed the service price"
      );
      return;
    }

    if (
      form.offerEnabled &&
      form.offerStartsAt &&
      form.offerEndsAt &&
      form.offerEndsAt <=
        form.offerStartsAt
    ) {
      toast.error(
        "Offer end date must be after the start date"
      );
      return;
    }

    const payload = {
      priceItemId:
        form.priceItemId,

      price,

      taxPercent:
        Number(form.taxPercent || 0),

      description:
        form.description.trim(),

      offerEnabled:
        form.offerEnabled,

      offerName:
        form.offerEnabled
          ? form.offerName.trim()
          : "",

      discountType:
        form.offerEnabled
          ? form.discountType
          : undefined,

      discountValue:
        form.offerEnabled
          ? discountValue
          : 0,

      offerStartsAt:
        form.offerEnabled &&
        form.offerStartsAt
          ? form.offerStartsAt
          : undefined,

      offerEndsAt:
        form.offerEnabled &&
        form.offerEndsAt
          ? form.offerEndsAt
          : undefined,
    };

    try {
      if (editingOffering) {
        await updateOffering.mutateAsync(
          {
            id: editingOffering._id,
            payload,
          }
        );

        toast.success(
          "Service offering updated"
        );
      } else {
        await createOffering.mutateAsync(
          payload
        );

        toast.success(
          "Service added successfully"
        );
      }

      setDialogOpen(false);
      setEditingOffering(null);
      setForm(emptyForm);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          "Unable to save service"
      );
    }
  }

  async function handleDisable(
    offeringId: string
  ) {
    try {
      await disableOffering.mutateAsync(
        offeringId
      );

      toast.success(
        "Service offering disabled"
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          "Unable to disable service"
      );
    }
  }

  function getOfferLabel(
    offering: any
  ) {
    if (!offering.offerEnabled) {
      return null;
    }

    if (
      offering.discountType ===
      "percentage"
    ) {
      return `${offering.discountValue}% OFF`;
    }

    return `${formatCurrency(
      Number(
        offering.discountValue || 0
      )
    )} OFF`;
  }

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Wrench className="h-4 w-4" />
            Business
            <ChevronRight className="h-4 w-4" />
            Services & Pricing
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Services & Pricing
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Decide which services your business offers,
            set your own prices, and create promotions
            customers can see.
          </p>
        </div>

        <Button
          onClick={openCreateDialog}
          className="h-11 rounded-xl"
          disabled={
            availableCatalogServices.length === 0
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <Card className="rounded-2xl border-border/70 bg-background">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Total Services
            </p>

            <div className="mt-2 flex items-end justify-between">
              <div className="text-2xl font-semibold">
                {offerings.length}
              </div>

              <div className="rounded-xl bg-muted p-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-background">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Active Services
            </p>

            <div className="mt-2 flex items-end justify-between">
              <div className="text-2xl font-semibold">
                {activeCount}
              </div>

              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                <Check className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-background">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Active Offers
            </p>

            <div className="mt-2 flex items-end justify-between">
              <div className="text-2xl font-semibold">
                {offerCount}
              </div>

              <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
                <BadgePercent className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-background">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Average Price
            </p>

            <div className="mt-2 flex items-end justify-between">
              <div className="text-2xl font-semibold">
                {formatCurrency(
                  averagePrice
                )}
              </div>

              <div className="rounded-xl bg-sky-50 p-2 text-sky-700">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="rounded-2xl border-border/70">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search your services..."
              className="h-11 rounded-xl pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Offerings */}
      <Card className="rounded-2xl border-border/70">

        <CardHeader className="border-b border-border/60">
          <div>
            <CardTitle className="text-lg">
              Your Services
            </CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              These are the services customers can book from your business.
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-0">

          {offeringsLoading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Loading services...
            </div>
          ) : filteredOfferings.length === 0 ? (
            <div className="p-12 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Wrench className="h-6 w-6 text-muted-foreground" />
              </div>

              <h3 className="mt-4 font-semibold">
                No services yet
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Add the services your business provides
                and set your own pricing.
              </p>

              <Button
                onClick={openCreateDialog}
                className="mt-5 rounded-xl"
                disabled={
                  availableCatalogServices.length === 0
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Service
              </Button>

            </div>
          ) : (
            <div className="divide-y divide-border">

              {filteredOfferings.map(
                (offering) => {

                  const pricing =
                    offering.pricing ||
                    calculateOfferingPrice(
                      offering.price,
                      offering.offerEnabled,
                      offering.discountType,
                      offering.discountValue
                    );

                  const offerLabel =
                    getOfferLabel(
                      offering
                    );

                  return (
                    <div
                      key={offering._id}
                      className="group flex flex-col gap-5 p-5 transition hover:bg-muted/20 lg:flex-row lg:items-center lg:justify-between"
                    >

                      {/* Left */}
                      <div className="flex min-w-0 gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                          <Wrench className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">
                              {offering.name}
                            </h3>

                            {offering.isActive ? (
                              <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                Active
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="rounded-full"
                              >
                                Inactive
                              </Badge>
                            )}

                            {offerLabel && (
                              <Badge className="gap-1 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                                <Tag className="h-3 w-3" />
                                {offerLabel}
                              </Badge>
                            )}
                          </div>

                          <p className="mt-1 max-w-xl truncate text-sm text-muted-foreground">
                            {offering.description ||
                              "No service description"}
                          </p>

                          {offering.offerEnabled &&
                            offering.offerName && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                Offer:{" "}
                                <span className="font-medium text-foreground">
                                  {offering.offerName}
                                </span>

                                {offering.offerStartsAt &&
                                  offering.offerEndsAt && (
                                    <>
                                      {" "}
                                      ·{" "}
                                      {formatDate(
                                        offering.offerStartsAt
                                      )}{" "}
                                      –{" "}
                                      {formatDate(
                                        offering.offerEndsAt
                                      )}
                                    </>
                                  )}
                              </div>
                            )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex items-center gap-8">

                        <div className="text-right">

                          {offering.offerEnabled &&
                          pricing.discountAmount > 0 ? (
                            <>
                              <div className="text-xs text-muted-foreground line-through">
                                {formatCurrency(
                                  pricing.basePrice
                                )}
                              </div>

                              <div className="text-lg font-semibold">
                                {formatCurrency(
                                  pricing.finalPrice
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="text-lg font-semibold">
                              {formatCurrency(
                                pricing.basePrice
                              )}
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground">
                            Provider price
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent
                            align="end"
                            className="w-44 rounded-xl"
                          >
                            <DropdownMenuItem
                              onClick={() =>
                                openEditDialog(
                                  offering
                                )
                              }
                            >
                              <Edit3 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>

                            {offering.isActive && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDisable(
                                    offering._id
                                  )
                                }
                                className="text-rose-600 focus:text-rose-600"
                              >
                                <Pause className="mr-2 h-4 w-4" />
                                Disable
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        
      >
        <DialogContent className="max-h-[90vh] w-full sm:w-150 md:w-225 lg:w-300  border-2 overflow-y-auto rounded-3xl">

          <DialogHeader>
            <DialogTitle>
              {editingOffering
                ? "Edit Service"
                : "Add Service"}
            </DialogTitle>

            <DialogDescription>
              Set your business price and optionally
              create a promotional offer.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">

            {/* Form */}
            <div className="space-y-6">

              {/* Service */}
              <div className="space-y-2">
                <Label>Service</Label>

                {editingOffering ? (
                  <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                    {selectedCatalogService?.name ||
                      editingOffering.name}
                  </div>
                ) : (
                  <Select
                    value={
                      form.priceItemId
                    }
                    onValueChange={
                       selectCatalogService
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select a platform service" />
                    </SelectTrigger>

                    <SelectContent>
                      {catalogLoading ? (
                        <SelectItem
                          value="loading"
                          disabled
                        >
                          Loading services...
                        </SelectItem>
                      ) : availableCatalogServices.length ===
                        0 ? (
                        <SelectItem
                          value="empty"
                          disabled
                        >
                          No services available
                        </SelectItem>
                      ) : (
                        availableCatalogServices.map(
                          (service) => (
                            <SelectItem
                              key={
                                service._id
                              }
                              value={
                                service._id
                              }
                              
                            >
                              {service.name} ·{" "}
                              {formatCurrency(
                                service.price
                              )}
                            </SelectItem>
                          )
                        )
                      )}
                    </SelectContent>
                  </Select>
                )}

                {selectedCatalogService && (
                  <p className="text-xs text-muted-foreground">
                    Platform reference price:{" "}
                    <span className="font-medium text-foreground">
                      {formatCurrency(
                        selectedCatalogService.price
                      )}
                    </span>
                  </p>
                )}
              </div>

              {/* Pricing */}
              <div className="grid gap-4 sm:grid-cols-2">

                <div className="space-y-2">
                  <Label>Your Price</Label>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      ₹
                    </span>

                    <Input
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(event) =>
                        updateForm({
                          price:
                            event.target.value,
                        })
                      }
                      className="h-11 rounded-xl pl-8"
                      placeholder="550"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tax %</Label>

                  <Input
                    type="number"
                    min="0"
                    value={
                      form.taxPercent
                    }
                    onChange={(event) =>
                      updateForm({
                        taxPercent:
                          event.target.value,
                      })
                    }
                    className="h-11 rounded-xl"
                  />
                </div>

              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>
                  Service description
                </Label>

                <Textarea
                  value={
                    form.description
                  }
                  onChange={(event) =>
                    updateForm({
                      description:
                        event.target.value,
                    })
                  }
                  className="min-h-24 rounded-xl"
                  placeholder="Describe what is included..."
                />
              </div>

              {/* Offer */}
              <div className="rounded-2xl border border-border/70 p-5">

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <div className="flex items-center gap-2">
                      <BadgePercent className="h-4 w-4" />

                      <h3 className="font-semibold">
                        Promotional offer
                      </h3>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Give customers a limited-time discount.
                    </p>
                  </div>

                  <Switch
                    checked={
                      form.offerEnabled
                    }
                    onCheckedChange={(
                      value
                    ) =>
                      updateForm({
                        offerEnabled:
                          value,
                      })
                    }
                  />

                </div>

                {form.offerEnabled && (
                  <div className="mt-5 space-y-4">

                    <div className="space-y-2">
                      <Label>
                        Offer name
                      </Label>

                      <Input
                        value={
                          form.offerName
                        }
                        onChange={(
                          event
                        ) =>
                          updateForm({
                            offerName:
                              event.target
                                .value,
                          })
                        }
                        className="h-11 rounded-xl"
                        placeholder="May Special"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">

                      <div className="space-y-2">
                        <Label>
                          Discount type
                        </Label>

                        <Select
                          value={
                            form.discountType
                          }
                          onValueChange={(
                            value:
                              | "percentage"
                              | "flat"
                          ) =>
                            updateForm({
                              discountType:
                                value,
                            })
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="percentage">
                              Percentage
                            </SelectItem>

                            <SelectItem value="flat">
                              Flat amount
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>
                          Discount
                        </Label>

                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            value={
                              form.discountValue
                            }
                            onChange={(
                              event
                            ) =>
                              updateForm({
                                discountValue:
                                  event.target
                                    .value,
                              })
                            }
                            className="h-11 rounded-xl pr-10"
                            placeholder={
                              form.discountType ===
                              "percentage"
                                ? "20"
                                : "100"
                            }
                          />

                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            {form.discountType ===
                            "percentage"
                              ? "%"
                              : "₹"}
                          </span>
                        </div>
                      </div>

                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">

                      <div className="space-y-2">
                        <Label>
                          Start date
                        </Label>

                        <Input
                          type="date"
                          value={
                            form.offerStartsAt
                          }
                          onChange={(event) =>
                            updateForm({
                              offerStartsAt:
                                event.target
                                  .value,
                            })
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>
                          End date
                        </Label>

                        <Input
                          type="date"
                          value={
                            form.offerEndsAt
                          }
                          onChange={(event) =>
                            updateForm({
                              offerEndsAt:
                                event.target
                                  .value,
                            })
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>

                    </div>

                  </div>
                )}

              </div>

            </div>

            {/* Customer Preview */}
            <div className="lg:sticky lg:top-0 lg:self-start">

              <div className="rounded-3xl border border-border/70 bg-muted/20 p-5">

                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Customer preview
                    </p>

                    <h3 className="mt-1 font-semibold">
                      How this service will appear
                    </h3>
                  </div>

                  <div className="rounded-xl bg-background p-2">
                    <Tag className="h-4 w-4" />
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">

                  <div className="h-32 bg-linear-to-br from-slate-900 to-slate-700" />

                  <div className="space-y-5 p-5">

                    <div>
                      <div className="text-lg font-semibold">
                        {selectedCatalogService?.name ||
                          editingOffering?.name ||
                          "Service name"}
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {form.description ||
                          "Your service description will appear here."}
                      </p>
                    </div>

                    {form.offerEnabled &&
                    form.offerName ? (
                      <Badge className="w-fit gap-1 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                        <BadgePercent className="h-3 w-3" />
                        {form.offerName}
                      </Badge>
                    ) : null}

                    <div>

                      {form.offerEnabled &&
                      previewPricing.discountAmount > 0 ? (
                        <div className="space-y-1">

                          <div className="text-sm text-muted-foreground line-through">
                            {formatCurrency(
                              previewPricing.basePrice
                            )}
                          </div>

                          <div className="text-3xl font-bold tracking-tight">
                            {formatCurrency(
                              previewPricing.finalPrice
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                            <TrendingDown className="h-4 w-4" />
                            Save{" "}
                            {formatCurrency(
                              previewPricing.discountAmount
                            )}
                          </div>

                        </div>
                      ) : (
                        <div className="text-3xl font-bold tracking-tight">
                          {form.price
                            ? formatCurrency(
                                Number(
                                  form.price
                                )
                              )
                            : "₹0"}
                        </div>
                      )}

                    </div>

                    <Button
                      className="w-full rounded-xl"
                      disabled
                    >
                      Book this service
                    </Button>

                  </div>
                </div>

              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">

            <Button
              variant="outline"
              onClick={() =>
                setDialogOpen(false)
              }
              className="rounded-xl"
            >
              Cancel
            </Button>

            <Button
              onClick={handleSave}
              disabled={
                createOffering.isPending ||
                updateOffering.isPending
              }
              className="rounded-xl"
            >
              {createOffering.isPending ||
              updateOffering.isPending
                ? "Saving..."
                : editingOffering
                ? "Save Changes"
                : "Add Service"}
            </Button>

          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
}