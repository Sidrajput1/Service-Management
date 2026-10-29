const validJob = (value) =>
  typeof value === "string" && /^[a-f\d]{24}$/iu.test(value);
/** Only a job identifier is accepted, never an arbitrary return URL. */
export function proJobReturn(value) {
  return validJob(value)
    ? `/technician/all-jobs/${value.toLowerCase()}`
    : "/technician/all-jobs";
}
export function comingSoonHref(jobId) {
  return validJob(jobId)
    ? `/app-coming-soon?${new URLSearchParams({ job: jobId.toLowerCase() })}`
    : "/app-coming-soon";
}
export const journeyStates = {
  idle: {
    title: "Tracking not started",
    text: "Location permission has not been requested. Enable optional arrival detection when you are ready to travel.",
  },
  requesting: {
    title: "Requesting device location",
    text: "Allow location in your browser if prompted. Tracking starts only after a usable observation is accepted by the server.",
  },
  reporting: {
    title: "Sending location observation",
    text: "Waiting for the server to validate this device observation. Arrival has not been confirmed.",
  },
  outside: {
    title: "Tracking active",
    text: "The server accepted a usable location update. You have not yet met the automatic-arrival conditions.",
  },
  qualifying: {
    title: "Tracking active · near destination",
    text: "The server accepted this observation. Another accurate reading with sufficient time between readings is needed before arrival can be confirmed.",
  },
  poor_accuracy: {
    title: "GPS accuracy is too low",
    text: "This observation did not qualify. Move to a clearer area or use the job’s manual arrival action.",
  },
  implausible_jump: {
    title: "Waiting for reliable GPS",
    text: "The server ignored a sudden location jump. Keep this page visible for another observation, or use manual arrival.",
  },
  arrived: {
    title: "Arrival confirmed",
    text: "Arrival was confirmed by the server. Customer OTP verification is still required before work begins.",
  },
  denied: {
    title: "Location permission denied",
    text: "You can retry after allowing Location in this site’s browser permissions. Servizato cannot change that permission. Manual arrival remains available.",
  },
  unavailable: {
    title: "Location temporarily unavailable",
    text: "The device could not provide a usable location. Retry in a clearer area or use manual arrival.",
  },
  timeout: {
    title: "Location request timed out",
    text: "The browser did not obtain a location in time. Retry with this page visible, or use manual arrival.",
  },
  insecure: {
    title: "A secure connection is required",
    text: "This browser needs HTTPS or a supported local development origin to access device location. Manual arrival remains available.",
  },
  unsupported: {
    title: "Browser location is unavailable",
    text: "This browser does not provide the location support required for optional arrival detection. You can continue with manual arrival.",
  },
  network_timeout: {
    title: "Location update timed out",
    text: "The server did not acknowledge this update in time. Reporting will retry with a later device observation; you can stop and retry or use manual arrival.",
  },
  interrupted: {
    title: "Location reporting interrupted",
    text: "The server has not accepted the latest update. Keep this page visible to retry, or use manual arrival.",
  },
  throttled: {
    title: "Waiting before the next update",
    text: "The server limited this update. A later device observation will be tried without advancing the job.",
  },
  paused: {
    title: "Tracking paused",
    text: "This page was hidden, so location observation stopped. Resume explicitly after returning to Servizato.",
  },
  ineligible: {
    title: "Tracking is unavailable for this job",
    text: "Refresh the job’s saved status. Observation is allowed only for the current assigned journey and its confirmed destination.",
  },
};
export function journeyStateInfo(state) {
  return journeyStates[state] || journeyStates.idle;
}
export function offersAppInformation(state) {
  return [
    "denied",
    "unavailable",
    "timeout",
    "insecure",
    "unsupported",
    "network_timeout",
    "interrupted",
  ].includes(state);
}
