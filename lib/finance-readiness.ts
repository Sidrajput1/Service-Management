import mongoose from "mongoose";
import {
  financeIndexDefinitions,
  matchingFinanceIndex,
} from "./finance-indexes.mjs";
import { ApiAuthError } from "./auth";
export async function financeReady() {
  const db = mongoose.connection.db;
  if (!db) return false;
  try {
    for (const [collection, keys, options] of financeIndexDefinitions) {
      const indexes = await db.collection(collection).listIndexes().toArray();
      if (!matchingFinanceIndex(indexes, keys, options)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
export async function requireFinanceReady() {
  if (!(await financeReady()))
    throw new ApiAuthError(
      "Finance setup is incomplete. An administrator must install and verify the finance indexes before using this action.",
      503,
    );
}
