import mongoose from "mongoose";
import { createHash, randomUUID } from "node:crypto";
import { ApiAuthError } from "./auth";
import { auditedChange } from "./moderation";
import { catalogAdminSchema } from "./catalog/admin-validation";
import { pricingUnits } from "./catalog/definition.mjs";
import { validateSkills } from "./marketplace-validation";
import { catalogRequestMeta } from "./admin-validation";
import {
  catalogNameKey,
  catalogNamePattern,
  revisionFilter,
  revisionOf,
} from "./moderation-policy.mjs";
import PriceItem from "@/models/PriceItem";

export async function writeCatalog(actorId: string, raw: unknown, id?: string) {
  const meta = catalogRequestMeta.parse(raw);
  if (id && meta.expectedVersion === undefined)
    throw new ApiAuthError(
      "Refresh this item before editing; its revision is required.",
      400,
    );
  const value = (id ? catalogAdminSchema.partial() : catalogAdminSchema).parse(
    raw,
  );
  const targetId =
    id ||
    createHash("sha256")
      .update(`catalog:${actorId}:${meta.requestId}`)
      .digest("hex")
      .slice(0, 24);
  return auditedChange(
    {
      actor: { id: actorId, kind: "admin" },
      targetType: "catalog",
      targetId,
      action: id ? "update" : "create",
      requestId: meta.requestId,
      expectedVersion: meta.expectedVersion,
      payload: value,
    },
    async (session) => {
      const current = id ? await PriceItem.findById(id).session(session) : null;
      if (id && !current) throw new ApiAuthError("Catalog item not found", 404);
      const version = revisionOf(current);
      if (current && version !== meta.expectedVersion)
        throw new ApiAuthError(
          "Another administrator changed this item. Refresh before saving.",
          409,
        );
      if (current && value.itemType && value.itemType !== current.itemType)
        throw new ApiAuthError(
          "An existing catalog item's type cannot be changed.",
          400,
        );
      if (
        current?.catalogKey &&
        value.catalogKey &&
        current.catalogKey !== value.catalogKey
      )
        throw new ApiAuthError("A stable catalog key cannot be renamed.", 400);
      const itemType = value.itemType || current?.itemType || "service",
        name = value.name || current?.name || "";
      const normalizedName = catalogNameKey(name);
      if (
        await PriceItem.exists({
          _id: { $ne: new mongoose.Types.ObjectId(targetId) },
          itemType,
          $or: [
            { normalizedName },
            { name: { $regex: catalogNamePattern(name), $options: "i" } },
          ],
        }).session(session)
      )
        throw new ApiAuthError(
          "This catalog name already exists, including capitalization/spacing variants. Review it instead of adding a duplicate.",
          409,
        );
      const skills = value.skillKeys ?? current?.skillKeys ?? [];
      if (skills.length) validateSkills(skills, current?.skillKeys || []);
      if (!current && itemType === "service" && !skills.length)
        throw new ApiAuthError(
          "Select at least one catalog skill for a new service.",
          400,
        );
      const unit = value.unit ?? current?.unit ?? "job";
      if (itemType === "service" && !pricingUnits.includes(unit || "job"))
        throw new ApiAuthError("Choose a supported service pricing unit.", 400);
      let suggested =
        value.suggestedPrice !== undefined
          ? value.suggestedPrice
          : current?.suggestedPrice;
      if (
        itemType === "service" &&
        value.suggestedPrice === undefined &&
        value.price !== undefined &&
        value.price !== current?.price
      )
        suggested =
          value.price > 0
            ? {
                ...current?.suggestedPrice,
                amount: value.price,
                currency: "INR",
                unit: unit || "job",
                kind: "configured",
                qualification:
                  "Administrator-configured reference; confirm scope, materials and taxes. Retained source/date, if any, describe the previous reference.",
              }
            : null;
      if (
        suggested?.kind === "public_listing" &&
        current?.suggestedPrice?.kind === "public_listing" &&
        (suggested.amount !== current.suggestedPrice.amount ||
          suggested.unit !== current.suggestedPrice.unit ||
          suggested.city !== current.suggestedPrice.city) &&
        suggested.sourceUrl === current.suggestedPrice.sourceUrl &&
        suggested.checkedAt === current.suggestedPrice.checkedAt
      )
        suggested = {
          ...suggested,
          kind: "configured",
          qualification:
            "Administrator-configured reference. Retained source/date describe the previous reference, not verification of this edited amount.",
        };
      const changes = {
        ...value,
        itemType,
        name,
        normalizedName,
        unit: unit || "job",
        categoryKey: value.categoryKey ?? current?.categoryKey ?? "other",
        skillKeys: skills,
        catalogKey:
          current?.catalogKey || value.catalogKey || `custom-${randomUUID()}`,
        suggestedPrice: suggested || null,
        price:
          itemType === "service" && value.suggestedPrice !== undefined
            ? suggested?.amount || 0
            : (value.price ?? current?.price ?? 0),
      };
      const before = current
        ? {
            name: current.name,
            isActive: current.isActive,
            reviewVersion: version,
            reference: current.suggestedPrice?.amount ?? current.price,
            unit: current.unit,
            categoryKey: current.categoryKey,
          }
        : {};
      let saved;
      if (current)
        saved = await PriceItem.findOneAndUpdate(
          { _id: targetId, ...revisionFilter(version) },
          { $set: changes, $inc: { reviewVersion: 1 } },
          { new: true, session, runValidators: true },
        );
      else
        [saved] = await PriceItem.create(
          [
            {
              ...changes,
              _id: new mongoose.Types.ObjectId(targetId),
              isActive: value.isActive ?? true,
              reviewVersion: 1,
            },
          ],
          { session },
        );
      if (!saved)
        throw new ApiAuthError(
          "This item changed. Refresh before saving.",
          409,
        );
      return {
        before,
        after: {
          name: saved.name,
          isActive: saved.isActive,
          reference: saved.suggestedPrice?.amount ?? saved.price,
          unit: saved.unit,
          categoryKey: saved.categoryKey,
          reviewVersion: revisionOf(saved),
        },
      };
    },
  );
}
