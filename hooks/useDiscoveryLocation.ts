"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import {
  createDiscoveryLocationStore,
  emptyDiscoverySnapshot,
  type DiscoverySnapshot,
  type DiscoverySource,
} from "@/lib/discovery-location.mjs";
export type {
  DiscoveryArea,
  DiscoverySnapshot,
  DiscoverySource,
} from "@/lib/discovery-location.mjs";

let store: ReturnType<typeof createDiscoveryLocationStore> | undefined;
function clientStore() {
  if (!store) {
    let storage: Storage | undefined;
    try {
      storage = window.localStorage;
    } catch {
      /* Browser restrictions retain memory-only preferences. */
    }
    store = createDiscoveryLocationStore(storage, window, { scope: null });
  }
  return store;
}
const subscribe = (listener: () => void) => clientStore().subscribe(listener);
const getSnapshot = (): DiscoverySnapshot => clientStore().getSnapshot();
const getServerSnapshot = (): DiscoverySnapshot => emptyDiscoverySnapshot;
export function useDiscoveryLocation() {
  const { data: session, status } = useSession();
  const id = session?.user?.id;
  const scope =
    status === "loading"
      ? null
      : status === "unauthenticated"
        ? "anonymous"
        : id
          ? `${session?.user?.role === "customer" ? "customer" : "user"}:${id}`
          : null;
  const shared = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  // Never display another logical user's Google-derived selection while an auth transition settles.
  const snapshot = shared.scope === scope ? shared : emptyDiscoverySnapshot;
  useEffect(() => {
    clientStore().setCaptureScope(scope);
  }, [scope]);
  const actions = useMemo(
    () => ({
      choose(area: unknown, source: DiscoverySource = "manual") {
        if (!scope) return false;
        const active = clientStore();
        if (active.getSnapshot().scope !== scope) return false;
        return active.choose(area, source);
      },
      captureCurrent() {
        if (!scope) return Promise.resolve(null);
        const active = clientStore();
        if (active.getSnapshot().scope !== scope) return Promise.resolve(null);
        return active.captureCurrent();
      },
      cancelCapture() {
        const active = clientStore();
        if (active.getSnapshot().scope === scope) active.cancelCapture();
      },
      dismiss() {
        if (!scope) return;
        const active = clientStore();
        if (active.getSnapshot().scope === scope) active.dismiss();
      },
      clear() {
        if (!scope) return;
        const active = clientStore();
        if (active.getSnapshot().scope === scope) active.clear();
      },
    }),
    [scope],
  );
  return { ...snapshot, ...actions };
}
