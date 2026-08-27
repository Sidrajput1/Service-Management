import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { connectToDb } from "@/lib/db";

import User from "@/models/user";
import Customer from "@/models/customer";
import { ServiceProvider, Technician,PriceItem } from "@/models";


export async function GET() {
  try {
    const user = await requireCurrentUser();

    await connectToDb();

    const dbUser = await User.findById(user._id)
      .select("name email phone role")
      .lean();

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let profile: any = null;

    if (dbUser.role === "customer") {
      profile = await Customer.findOne({
        userId: dbUser._id,
      }).lean();
    }

    if (dbUser.role === "technician") {
      profile = await Technician.findOne({
        userId: dbUser._id,
      })
        .populate("serviceProviderId", "companyName businessType")
        .lean();
    }

    if (dbUser.role === "service_provider") {
      profile = await ServiceProvider.findOne({
        ownerId: dbUser._id,
      })
        .populate(
          "services",
          "name itemType price taxPercent description isActive",
        )
        .lean();
    }

    return NextResponse.json({
      success: true,

      user: {
        id: dbUser._id,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        role: dbUser.role,
      },

      profile,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Unable to load profile",
      },
      {
        status: error.status || 500,
      },
    );
  }
};


export async function PATCH(request: Request) {
  try {
    const user = await requireCurrentUser();

    await connectToDb();

    const body = await request.json();

    /*
     * -----------------------------------------
     * COMMON USER FIELDS
     * -----------------------------------------
     *
     * Email and role are intentionally excluded.
     */
    const allowedUserFields: Record<
      string,
      any
    > = {};

    if (
      typeof body.name === "string" &&
      body.name.trim()
    ) {
      allowedUserFields.name =
        body.name.trim();
    }

    if (
      typeof body.phone === "string"
    ) {
      allowedUserFields.phone =
        body.phone.trim() || null;
    }

    if (
      Object.keys(allowedUserFields)
        .length
    ) {
      await User.findByIdAndUpdate(
        user._id,
        allowedUserFields,
        {
          new: true,
          runValidators: true,
        },
      );
    }

    /*
     * -----------------------------------------
     * CUSTOMER
     * -----------------------------------------
     */
    if (user.role === "customer") {
      const update: Record<
        string,
        any
      > = {};

      if (
        typeof body.name === "string" &&
        body.name.trim()
      ) {
        update.name =
          body.name.trim();
      }

      if (
        typeof body.phone === "string"
      ) {
        update.phone =
          body.phone.trim();
      }

      if (
        typeof body.notes === "string"
      ) {
        update.notes =
          body.notes.trim();
      }

      if (
        Array.isArray(body.addresses)
      ) {
        update.addresses =
          body.addresses;
      }

      await Customer.findOneAndUpdate(
        {
          userId: user._id,
        },
        update,
        {
          new: true,
          runValidators: true,
        },
      );
    }

    /*
     * -----------------------------------------
     * TECHNICIAN
     * -----------------------------------------
     */
    if (user.role === "technician") {
      const technicianUpdate: Record<
        string,
        any
      > = {};

      if (
        Array.isArray(body.skills)
      ) {
        technicianUpdate.skills =
          body.skills
            .filter(
              (item: any) =>
                typeof item ===
                "string",
            )
            .map(
              (item: string) =>
                item.trim(),
            )
            .filter(Boolean);
      }

      if (
        typeof body.vehicleType ===
        "string"
      ) {
        technicianUpdate.vehicleType =
          body.vehicleType.trim();
      }

      /*
       * Do NOT allow the profile page to
       * modify:
       *
       * serviceProviderId
       * status
       * isActive
       * rating
       * jobsCompleted
       * currentLocation
       */
      await Technician.findOneAndUpdate(
        {
          userId: user._id,
        },
        technicianUpdate,
        {
          new: true,
          runValidators: true,
        },
      );
    }

    /*
     * -----------------------------------------
     * SERVICE PROVIDER
     * -----------------------------------------
     */
    if (
      user.role ===
      "service_provider"
    ) {
      const providerUpdate: Record<
        string,
        any
      > = {};

      if (
        typeof body.companyName ===
        "string" &&
        body.companyName.trim()
      ) {
        providerUpdate.companyName =
          body.companyName.trim();
      }

      if (
        typeof body.businessType ===
        "string"
      ) {
        providerUpdate.businessType =
          body.businessType.trim();
      }

      if (
        typeof body.description ===
        "string"
      ) {
        providerUpdate.description =
          body.description.trim();
      }

      if (
        typeof body.phone === "string"
      ) {
        providerUpdate.phone =
          body.phone.trim();
      }

      /*
       * Email remains controlled by the
       * authentication/account layer.
       *
       * Do NOT update ownerId.
       * Do NOT update verificationStatus.
       * Do NOT update trial dates.
       * Do NOT update status.
       */
      if (body.address) {
        providerUpdate.address = {
          addressLine:
            String(
              body.address
                .addressLine ||
                "",
            ).trim(),

          city: String(
            body.address.city ||
              "",
          ).trim(),

          state: String(
            body.address.state ||
              "",
          ).trim(),

          pincode: String(
            body.address.pincode ||
              "",
          ).trim(),

          location:
            body.address.location || {
              type: "Point",
              coordinates: [0, 0],
            },
        };
      }

      if (
        Array.isArray(
          body.serviceAreas,
        )
      ) {
        providerUpdate.serviceAreas =
          body.serviceAreas
            .filter(
              (item: any) =>
                typeof item ===
                "string",
            )
            .map(
              (item: string) =>
                item.trim(),
            )
            .filter(Boolean);
      }

      await ServiceProvider.findOneAndUpdate(
        {
          ownerId: user._id,
        },
        providerUpdate,
        {
          new: true,
          runValidators: true,
        },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Profile updated successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to update profile",
      },
      {
        status: error.status || 500,
      },
    );
  }
}
