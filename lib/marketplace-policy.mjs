/** Pure policies shared by request validation, migrations and tests. */
export const normalizeText = (value) =>
  typeof value === "string"
    ? value.normalize("NFKC").trim().replace(/\s+/gu, " ")
    : "";
export const normalizeKey = (value) =>
  normalizeText(value).toLocaleLowerCase("en-IN");
const stateAliases = {
  "andhra pradesh": ["ap"],
  "arunachal pradesh": ["ar"],
  assam: ["as"],
  bihar: ["br"],
  chhattisgarh: ["cg", "chattisgarh"],
  goa: ["ga"],
  gujarat: ["gj"],
  haryana: ["hr"],
  "himachal pradesh": ["hp"],
  jharkhand: ["jh"],
  karnataka: ["ka"],
  kerala: ["kl"],
  "madhya pradesh": ["mp"],
  maharashtra: ["mh"],
  manipur: ["mn"],
  meghalaya: ["ml"],
  mizoram: ["mz"],
  nagaland: ["nl"],
  odisha: ["or", "od", "orissa"],
  punjab: ["pb"],
  rajasthan: ["rj"],
  sikkim: ["sk"],
  "tamil nadu": ["tn"],
  telangana: ["ts", "tg"],
  tripura: ["tr"],
  "uttar pradesh": ["up", "u.p.", "u p"],
  uttarakhand: ["uk", "ua", "uttaranchal"],
  "west bengal": ["wb"],
  delhi: ["dl", "new delhi", "nct of delhi"],
  "jammu and kashmir": ["jk", "j&k"],
  ladakh: ["la"],
  chandigarh: ["ch"],
  puducherry: ["py", "pondicherry"],
  "andaman and nicobar islands": ["an"],
  lakshadweep: ["ld"],
  "dadra and nagar haveli and daman and diu": ["dn", "dd"],
};
const cityAliases = {
  bengaluru: ["bangalore"],
  mumbai: ["bombay"],
  chennai: ["madras"],
  kolkata: ["calcutta"],
  gurugram: ["gurgaon"],
  prayagraj: ["allahabad"],
  varanasi: ["banaras", "benares"],
  "new delhi": ["delhi"],
};
function canonicalKey(value, aliases) {
  const key = normalizeKey(value);
  return (
    Object.entries(aliases).find(
      ([name, values]) => name === key || values.includes(key),
    )?.[0] || key
  );
}
export const normalizeStateKey = (value) => canonicalKey(value, stateAliases);
export const normalizeCityKey = (value) => canonicalKey(value, cityAliases);
export const normalizePincode = (value) =>
  normalizeText(value).replace(/\s/gu, "");
export const stateAliasKeys = (value) => {
  const key = normalizeStateKey(value);
  return [key, ...(stateAliases[key] || [])];
};
export const cityAliasKeys = (value) => {
  const key = normalizeCityKey(value);
  return [key, ...(cityAliases[key] || [])];
};
export const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function coverageKey(area) {
  return [
    normalizeCityKey(area.city),
    normalizeStateKey(area.state),
    normalizeKey(area.locality),
    normalizePincode(area.pincode),
  ].join("|");
}
export function normalizeCoverage(area) {
  return {
    ...area,
    city: normalizeText(area.city),
    state: normalizeText(area.state),
    locality: normalizeText(area.locality),
    pincode: normalizePincode(area.pincode),
    cityKey: normalizeCityKey(area.city),
    stateKey: normalizeStateKey(area.state),
    localityKey: normalizeKey(area.locality),
    isActive: area.isActive !== false,
  };
}
export function servesLocation(areas, search) {
  const requested = {
    city: normalizeCityKey(search.city),
    state: normalizeStateKey(search.state),
    locality: normalizeKey(search.locality),
    pincode: normalizePincode(search.pincode),
  };
  if (
    !requested.city &&
    !requested.state &&
    !requested.locality &&
    !requested.pincode
  )
    return true;
  return areas.some((area) => {
    if (
      area.isActive === false ||
      (requested.city && normalizeCityKey(area.city) !== requested.city) ||
      (requested.state &&
        normalizeStateKey(area.state) &&
        normalizeStateKey(area.state) !== requested.state)
    )
      return false;
    const locality = normalizeKey(area.locality),
      pin = normalizePincode(area.pincode);
    if (
      requested.locality &&
      locality !== requested.locality &&
      (locality || !(requested.city || requested.pincode))
    )
      return false;
    if (
      requested.pincode &&
      pin !== requested.pincode &&
      (pin || !requested.city || (locality && !requested.locality))
    )
      return false;
    return true;
  });
}
/** A booking assessment requires structured city and PIN; missing restrictions cannot prove a match.
 * @returns {{status: "matched"|"outside"|"uncertain", requiresProviderConfirmation: boolean}}
 */
export function assessCoverage(areas, address) {
  const location = {
    city: normalizeCityKey(address?.city),
    state: normalizeStateKey(address?.state),
    locality: normalizeKey(address?.locality),
    pincode: normalizePincode(address?.pincode),
  };
  if (!location.city || !/^[1-9]\d{5}$/u.test(location.pincode))
    return { status: "uncertain", requiresProviderConfirmation: true };
  let uncertain = false;
  for (const area of areas || []) {
    if (area.isActive === false || !servesLocation([area], location)) continue;
    // A city-wide area is valid, but a restriction absent from the destination is uncertain.
    if (
      (normalizeStateKey(area.state) && !location.state) ||
      (normalizeKey(area.locality) && !location.locality) ||
      (!normalizeCityKey(area.city) && !normalizePincode(area.pincode))
    ) {
      uncertain = true;
      continue;
    }
    return { status: "matched", requiresProviderConfirmation: false };
  }
  return {
    status: uncertain ? "uncertain" : "outside",
    requiresProviderConfirmation: true,
  };
}
/** Never turn a profile city into coverage. PIN restrictions take precedence in legacy data. */
export function legacyCoverage(provider) {
  if (provider.coverageVersion === 1) return provider.coverageAreas || [];
  const entries = [
    ...new Set(
      (provider.serviceAreas || []).map(normalizeText).filter(Boolean),
    ),
  ];
  const pins = entries.filter((value) => /^[1-9]\d{5}$/.test(value));
  if (pins.length)
    return pins.map((pincode) =>
      normalizeCoverage({
        city: provider.address?.city || "",
        state: provider.address?.state || "",
        pincode,
        locality: "",
        isActive: true,
      }),
    );
  return entries
    .map((value) =>
      normalizeCoverage({
        city: provider.address?.city || "",
        state: provider.address?.state || "",
        locality:
          normalizeKey(value) === normalizeKey(provider.address?.city)
            ? ""
            : value,
        pincode: "",
        isActive: true,
      }),
    )
    .filter((area) => area.city);
}
/** Wilson lower bound on genuine 1..5 reviews, mapped back to the same scale. */
export function confidenceRating(average, count) {
  if (!Number.isFinite(average) || count <= 0) return 0;
  const p = Math.min(1, Math.max(0, (average - 1) / 4)),
    z = 1.96;
  const lower =
    (p +
      (z * z) / (2 * count) -
      z * Math.sqrt((p * (1 - p)) / count + (z * z) / (4 * count * count))) /
    (1 + (z * z) / count);
  return 1 + lower * 4;
}
export function retainSkillSelection(selected, previous, activeKeys) {
  return [...new Set(selected)].every(
    (key) => activeKeys.includes(key) || previous.includes(key),
  );
}
export function canPerformService(skillKeys, requiredSkillKeys) {
  return (
    !requiredSkillKeys?.length ||
    requiredSkillKeys.some((key) => (skillKeys || []).includes(key))
  );
}
