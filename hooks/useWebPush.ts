"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  browserPushFacts,
  disablePushDevice,
  dismissPushPrompt,
  enablePushDevice,
  inspectPushDevice,
  PushClientError,
  pushPromptDismissed,
  removePushDevice,
  synchronizePushOwner,
  type PushDeviceState,
} from "@/lib/push-client";

const errorText = (error: unknown) =>
  error instanceof PushClientError
    ? error.message
    : "Notification settings could not be updated. Please try again.";
export function useWebPushController() {
  const { data: session, status } = useSession();
  const ownerId =
    status === "authenticated" && !session?.user.mustChangePassword
      ? session?.user.id || null
      : null;
  const owner = useRef(ownerId);
  owner.current = ownerId;
  const requestVersion = useRef(0),
    operation = useRef(false);
  const [record, setRecord] = useState<{
    owner: string | null;
    snapshot: PushDeviceState | null;
    error: string;
    loading: boolean;
  }>({ owner: null, snapshot: null, error: "", loading: true });
  const [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState(""),
    [dismissed, setDismissed] = useState(false);
  const refresh = useCallback(async () => {
    if (!ownerId) return;
    const version = ++requestVersion.current;
    setRecord((previous) => ({
      ...previous,
      owner: ownerId,
      loading: true,
      error: "",
    }));
    try {
      const snapshot = await inspectPushDevice(ownerId);
      if (owner.current === ownerId && version === requestVersion.current)
        setRecord({ owner: ownerId, snapshot, error: "", loading: false });
    } catch (error) {
      if (owner.current === ownerId && version === requestVersion.current)
        setRecord((previous) => ({
          owner: ownerId,
          snapshot: previous.owner === ownerId ? previous.snapshot : null,
          error: errorText(error),
          loading: false,
        }));
    }
  }, [ownerId]);
  useEffect(() => {
    if (status === "loading") return;
    requestVersion.current++;
    setRecord({
      owner: ownerId,
      snapshot: null,
      error: "",
      loading: Boolean(ownerId),
    });
    setFeedback("");
    setDismissed(ownerId ? pushPromptDismissed(ownerId) : true);
    void synchronizePushOwner(ownerId).then(() => {
      if (owner.current === ownerId && ownerId) void refresh();
    });
  }, [ownerId, status, refresh]);
  useEffect(() => {
    if (!ownerId) return;
    const focus = () => {
      if (!operation.current) void refresh();
    };
    const visible = () => {
      if (document.visibilityState === "visible") focus();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [ownerId, refresh]);
  async function run(action: () => Promise<void>, message: string) {
    if (!ownerId || operation.current) return;
    const account = ownerId;
    operation.current = true;
    setBusy(true);
    setFeedback("");
    try {
      // action() is invoked synchronously; Enable can request native permission directly from the click.
      await action();
      if (owner.current === account) {
        setFeedback(message);
        toast.success(message);
        setDismissed(pushPromptDismissed(account));
        await refresh();
      }
    } catch (error) {
      if (owner.current === account) {
        await refresh();
        if (owner.current === account) {
          toast.error(errorText(error));
          setRecord((previous) => ({ ...previous, error: errorText(error) }));
        }
      }
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  const snapshot = record.owner === ownerId ? record.snapshot : null;
  const facts = browserPushFacts();
  const enabled = Boolean(
    !record.error &&
      facts.permission === "granted" &&
      snapshot &&
      snapshot.hasSubscription &&
      snapshot.serverDevice?.isActive &&
      snapshot.workerBound &&
      snapshot.keyMatches !== false,
  );
  return {
    authenticated: Boolean(ownerId),
    ownerId,
    snapshot,
    facts,
    loading:
      status === "loading" ||
      Boolean(ownerId && (record.owner !== ownerId || record.loading)),
    busy,
    error: record.owner === ownerId ? record.error : "",
    feedback,
    enabled,
    dismissed,
    refresh,
    dismissPrompt() {
      if (ownerId) {
        dismissPushPrompt(ownerId);
        setDismissed(true);
      }
    },
    enable() {
      return run(
        () => enablePushDevice(ownerId!),
        "Notifications are enabled on this device.",
      );
    },
    disable() {
      return run(
        () => disablePushDevice(ownerId!, snapshot?.serverDevice?.id),
        "Push notifications are disabled on this device. In-app notifications remain available.",
      );
    },
    removeDevice(id: string) {
      return run(
        () =>
          id === snapshot?.serverDevice?.id
            ? disablePushDevice(ownerId!, id)
            : removePushDevice(ownerId!, id),
        "The selected device has been disabled. Your other devices are unchanged.",
      );
    },
  };
}
export type WebPushController = ReturnType<typeof useWebPushController>;
export const WebPushContext = createContext<WebPushController | null>(null);
export function useWebPush() {
  const value = useContext(WebPushContext);
  if (!value)
    throw new Error(
      "Push notification settings require PushNotificationsProvider.",
    );
  return value;
}
