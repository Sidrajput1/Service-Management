"use client";

import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  Search,
  Star,
  Tag,
  Users,
  Wrench,
} from "lucide-react";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCreateServiceRequest,
  useCustomerProviders,
  useCustomerServices,
} from "@/hooks/useCustomDiscovery";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginInput } from "@/components/ui/login-input";

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function CustomerServiceDiscoveryPage() {
  const { data: serviceData, isLoading: servicesLoading } =
    useCustomerServices();

  const searchParams = useSearchParams();
  const router = useRouter();

  const serviceFromUrl = searchParams.get("service") || "";
  const serviceIdFromUrl = searchParams.get("serviceId") || "";

  //const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState(serviceIdFromUrl);

  const [search, setSearch] = useState(serviceFromUrl);

  const [city, setCity] = useState("");

  const [pincode, setPincode] = useState("");

  const { data: providerData, isLoading: providersLoading } =
    useCustomerProviders({
      serviceId: selectedServiceId,
      city,
      pincode,
    });

  const createRequest = useCreateServiceRequest();

  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);

  const [addressLine, setAddressLine] = useState("");

  const [preferredDate, setPreferredDate] = useState("");

  const [description, setDescription] = useState("");

  const services = serviceData?.services || [];

  const providers = providerData?.providers || [];

  console.log("providers data", providers);

  useEffect(() => {
  /*
   * Case 1:
   * Dashboard/popular service already gives us
   * the real PriceItem ID.
   */
  if (serviceIdFromUrl) {
    setSelectedServiceId(
      serviceIdFromUrl,
    );

    return;
  }

  /*
   * Case 2:
   * Dashboard search gives us text:
   *
   * /customer/services?service=ac
   *
   * Resolve that text to a PriceItem.
   */
  if (!serviceFromUrl) {
    return;
  }

  if (servicesLoading) {
    return;
  }

  if (!services.length) {
    setSelectedServiceId("");
    return;
  }

  const normalizedSearch =
    serviceFromUrl
      .trim()
      .toLowerCase();

  /*
   * Prefer an exact match.
   *
   * "AC Cleaning"
   * should select "AC Cleaning"
   * rather than another "AC..." service.
   */
  const exactMatch =
    services.find(
      (service: any) =>
        String(
          service.name,
        )
          .trim()
          .toLowerCase() ===
        normalizedSearch,
    );

  /*
   * Otherwise use the first matching
   * service returned by the search API.
   *
   * Example:
   * "ac" → AC Cleaning / AC Repair
   *
   * We use the first best match for now.
   */
  const matchedService =
    exactMatch ||
    services[0];

  if (matchedService?._id) {
    setSelectedServiceId(
      String(
        matchedService._id,
      ),
    );

    /*
     * Convert the URL to the canonical form.
     *
     * Example:
     * /services?service=AC%20Cleaning
     *
     * becomes:
     * /services?serviceId=69d...
     *
     * This prevents ambiguity on refresh.
     */
    router.replace(
      `/customer/services?serviceId=${encodeURIComponent(
        String(
          matchedService._id,
        ),
      )}`,
    );
  }
}, [
  serviceFromUrl,
  serviceIdFromUrl,
  services,
  servicesLoading,
  router,
]);

  async function handleCreateRequest() {
    if (!selectedProvider) {
      return;
    }

    if (!addressLine.trim() || !city.trim() || !pincode.trim()) {
      toast.error("Enter your complete service address");

      return;
    }

    try {
      const response = await createRequest.mutateAsync({
        serviceOfferingId: selectedProvider.offeringId,

        address: {
          addressLine: addressLine.trim(),

          city: city.trim(),

          pincode: pincode.trim(),
        },

        preferredDate: preferredDate || undefined,

        description: description.trim(),
      });

      toast.success("Service request sent successfully");

      setDialogOpen(false);

      setAddressLine("");
      setPreferredDate("");
      setDescription("");
      setSelectedProvider(null);

      console.log("Service request:", response);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error || "Unable to create service request",
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
        <div className="max-w-3xl">
          <Badge className="mb-4 rounded-full bg-white/10 text-white hover:bg-white/10">
            Service Marketplace
          </Badge>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Find the right professional for your service
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Choose a service, tell us where you need it, and compare verified
            service providers near you.
          </p>
        </div>

        {/* Search */}
        <div className="mt-8 grid gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur sm:grid-cols-[1fr_1fr_140px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <select
              value={selectedServiceId}
              onChange={(event) => setSelectedServiceId(event.target.value)}
              className="h-11 rounded-xl border-white/10 bg-white/10 pl-11 text-foreground dark:text-background placeholder:text-slate-400 focus-visible:ring-white/20"
            >
              <option value="">Select a service</option>

              {services.map((service: any) => (
                <option key={service._id} value={service._id} className="font-semibold">
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="City"
            className="h-11 rounded-xl border-white/10 bg-white/10 pl-4 text-white placeholder:text-slate-400 focus-visible:ring-white/20"
          />

          <Input
            value={pincode}
            onChange={(event) => setPincode(event.target.value)}
            placeholder="Pincode"
            className="h-12 rounded-xl border-white/10 bg-white/10 pl-4 text-white placeholder:text-slate-400 focus-visible:ring-white/20"
          />
        </div>
      </section>

      {/* Loading */}
      {providersLoading && selectedServiceId && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div
              key={index}
              className="h-72 animate-pulse rounded-3xl bg-muted"
            />
          ))}
        </div>
      )}

      {/* Results */}
      {!providersLoading && selectedServiceId && providers.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold">Available providers</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Compare services, pricing, offers and availability.
              </p>
            </div>

            <Badge variant="secondary" className="rounded-full">
              {providers.length} found
            </Badge>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {providers.map((item: any) => {
              const pricing = item.pricing;
              console.log(item);
              return (
                <Card
                  key={item.offeringId}
                  className="overflow-hidden rounded-3xl border-border/70 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="h-28 bg-linear-to-br from-slate-950 to-slate-700" />

                  <CardContent className="-mt-5 relative p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-border">
                        <Wrench className="h-5 w-5 text-slate-900" />
                      </div>

                      <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Verified
                      </Badge>
                    </div>

                    <div className="mt-4">
                      <h3 className="text-lg font-semibold">
                        {item.provider.companyName}
                      </h3>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.service.name}
                      </p>
                    </div>
                    {/* adding rating count  */}
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />

                        <span className="font-semibold">
                          {item.rating > 0 ? item.rating.toFixed(1) : "New"}
                        </span>
                      </div>

                      {item.reviewCount > 0 && (
                        <>
                          <span className="text-muted-foreground">·</span>

                          <span className="text-muted-foreground">
                            {item.reviewCount}{" "}
                            {item.reviewCount === 1 ? "review" : "reviews"}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.distanceKm !== null && (
                        <Badge variant="secondary" className="rounded-full">
                          <MapPin className="mr-1 h-3 w-3" />
                          {item.distanceKm} km
                        </Badge>
                      )}

                      <Badge variant="secondary" className="rounded-full">
                        <Users className="mr-1 h-3 w-3" />
                        {item.availability.available
                          ? `${item.availability.availableTechnicians} available`
                          : "Currently busy"}
                      </Badge>
                    </div>

                    {/* Offer */}
                    {pricing.offerActive && (
                      <div className="mt-4 rounded-2xl bg-amber-50 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                          <Tag className="h-4 w-4" />
                          {pricing.offerName}
                        </div>

                        <div className="mt-1 text-xs text-amber-700">
                          Save {currency(pricing.discountAmount)}
                        </div>
                      </div>
                    )}

                    {/* Price */}
                    <div className="mt-5">
                      {pricing.offerActive ? (
                        <>
                          <div className="text-sm text-muted-foreground line-through">
                            {currency(pricing.basePrice)}
                          </div>

                          <div className="text-2xl font-bold">
                            {currency(pricing.finalPrice)}
                          </div>
                        </>
                      ) : (
                        <div className="text-2xl font-bold">
                          {currency(pricing.basePrice)}
                        </div>
                      )}

                      <p className="mt-1 text-xs text-muted-foreground">
                        Service price
                      </p>
                    </div>

                    <Button
                      className="mt-5 w-full rounded-xl"
                      onClick={() => {
                        setSelectedProvider(item);

                        setDialogOpen(true);
                      }}
                    >
                      Request Service
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* No results */}
      {!providersLoading && selectedServiceId && providers.length === 0 && (
        <Card className="rounded-3xl">
          <CardContent className="p-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>

            <h3 className="mt-4 text-lg font-semibold">No providers found</h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Try another city, pincode, or service.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Initial state */}
      {!selectedServiceId && (
        <Card className="rounded-3xl">
          <CardContent className="p-14 text-center">
            <Wrench className="mx-auto h-8 w-8 text-muted-foreground" />

            <h3 className="mt-4 text-lg font-semibold">
              What service do you need?
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Select a service above to discover verified providers available
              for your area.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Request dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request service</DialogTitle>

            <DialogDescription>
              {selectedProvider?.provider?.companyName} ·{" "}
              {selectedProvider?.service?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedProvider && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Estimated price
                  </span>

                  <span className="text-xl font-semibold">
                    {currency(selectedProvider.pricing.finalPrice)}
                  </span>
                </div>

                {selectedProvider.pricing.offerActive && (
                  <p className="mt-1 text-xs text-emerald-600">
                    {selectedProvider.pricing.offerName}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Service address</label>

                <Input
                  value={addressLine}
                  onChange={(event) => setAddressLine(event.target.value)}
                  placeholder="House number, street, area"
                  className="mt-2 h-11 rounded-xl"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Preferred date & time
                </label>

                <Input
                  type="datetime-local"
                  value={preferredDate}
                  onChange={(event) => setPreferredDate(event.target.value)}
                  className="mt-2 h-11 rounded-xl"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Tell us what you need
                </label>

                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the problem or any special requirement..."
                  className="mt-2 rounded-xl"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>

            <Button
              onClick={handleCreateRequest}
              disabled={createRequest.isPending}
              className="rounded-xl"
            >
              {createRequest.isPending ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
