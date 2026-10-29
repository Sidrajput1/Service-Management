/** Versioned taxonomy used by seeds, validation and the catalog API. Never an availability claim. */
/** @type {Array<[string, string, string[], Array<[string, string, string, string]>]>} */
const definitions = [
  [
    "electrical",
    "Electrical",
    ["switches", "fans", "lighting", "wiring", "mcb"],
    [
      [
        "switch-socket-replacement",
        "Switch/socket replacement",
        "item",
        "switches",
      ],
      ["switchboard-repair", "Switchboard repair", "item", "switches"],
      ["fan-installation", "Ceiling fan installation", "item", "fans"],
      ["fan-repair", "Fan repair", "item", "fans"],
      ["light-installation", "Light installation", "item", "lighting"],
      ["wiring-inspection", "Electrical wiring inspection", "visit", "wiring"],
      ["mcb-replacement", "MCB replacement", "item", "mcb"],
    ],
  ],
  [
    "plumbing",
    "Plumbing",
    ["taps", "leaks", "drainage", "bathroom-fittings"],
    [
      ["tap-repair", "Tap repair", "item", "taps"],
      ["pipe-leak-repair", "Pipe leakage repair", "job", "leaks"],
      ["drain-unblocking", "Drain unblocking", "job", "drainage"],
      [
        "external-pvc-flush-repair",
        "External PVC flush tank repair",
        "item",
        "bathroom-fittings",
      ],
      [
        "bathroom-fitting",
        "Bathroom fitting installation",
        "item",
        "bathroom-fittings",
      ],
    ],
  ],
  [
    "ac",
    "AC services",
    ["ac-installation", "ac-maintenance", "ac-diagnostics"],
    [
      ["ac-foam-cleaning", "Foam-jet AC cleaning", "ac", "ac-maintenance"],
      ["ac-inspection", "AC inspection", "visit", "ac-diagnostics"],
      [
        "split-ac-installation",
        "Split AC installation",
        "ac",
        "ac-installation",
      ],
      ["ac-uninstallation", "AC uninstallation", "ac", "ac-installation"],
    ],
  ],
  [
    "appliances",
    "Appliance repair",
    ["washing-machine", "refrigerator", "microwave", "television", "chimney"],
    [
      [
        "washing-machine-inspection",
        "Washing machine inspection",
        "visit",
        "washing-machine",
      ],
      [
        "refrigerator-inspection",
        "Refrigerator inspection",
        "visit",
        "refrigerator",
      ],
      ["microwave-inspection", "Microwave inspection", "visit", "microwave"],
      ["television-inspection", "Television inspection", "visit", "television"],
      ["chimney-cleaning", "Chimney cleaning", "item", "chimney"],
    ],
  ],
  [
    "water-purifier",
    "Water purifier & RO",
    ["ro-maintenance", "ro-installation"],
    [
      ["ro-service", "RO water purifier service", "item", "ro-maintenance"],
      ["ro-installation", "RO installation", "item", "ro-installation"],
    ],
  ],
  [
    "geyser",
    "Geyser services",
    ["geyser-installation", "geyser-repair"],
    [
      [
        "geyser-installation",
        "Geyser installation",
        "item",
        "geyser-installation",
      ],
      ["geyser-inspection", "Geyser inspection", "visit", "geyser-repair"],
    ],
  ],
  [
    "cleaning",
    "Home cleaning",
    [
      "bathroom-cleaning",
      "kitchen-cleaning",
      "deep-cleaning",
      "upholstery-cleaning",
    ],
    [
      [
        "bathroom-cleaning",
        "Bathroom cleaning",
        "bathroom",
        "bathroom-cleaning",
      ],
      ["kitchen-cleaning", "Kitchen cleaning", "kitchen", "kitchen-cleaning"],
      ["home-deep-cleaning", "Home deep cleaning", "job", "deep-cleaning"],
      ["sofa-cleaning", "Sofa cleaning", "seat", "upholstery-cleaning"],
      ["mattress-cleaning", "Mattress cleaning", "item", "upholstery-cleaning"],
    ],
  ],
  [
    "carpentry",
    "Carpentry",
    ["furniture-assembly", "door-locks", "woodwork"],
    [
      [
        "furniture-assembly",
        "Furniture assembly",
        "item",
        "furniture-assembly",
      ],
      ["door-lock-repair", "Door & lock repair", "item", "door-locks"],
      ["shelf-installation", "Shelf installation", "item", "woodwork"],
      ["cabinet-repair", "Cabinet repair", "item", "woodwork"],
    ],
  ],
  [
    "painting",
    "Painting & wall work",
    ["painting", "wall-repair"],
    [
      ["interior-painting", "Interior painting", "sq_ft", "painting"],
      ["wall-repair", "Wall repair & preparation", "sq_ft", "wall-repair"],
    ],
  ],
  [
    "pest-control",
    "Pest control",
    ["general-pest", "termite-treatment"],
    [
      ["general-pest-control", "General pest control", "job", "general-pest"],
      [
        "termite-inspection",
        "Termite inspection",
        "visit",
        "termite-treatment",
      ],
    ],
  ],
  [
    "handyman",
    "Handyman & installation",
    ["wall-mounting", "curtains", "home-installation"],
    [
      ["wall-decor-mounting", "Wall decor mounting", "item", "wall-mounting"],
      [
        "curtain-rod-installation",
        "Curtain rod installation",
        "item",
        "curtains",
      ],
      [
        "home-installation-inspection",
        "Home installation inspection",
        "visit",
        "home-installation",
      ],
    ],
  ],
];
export const catalogCategories = definitions.map(([key, label]) => ({
  key,
  label,
  isActive: true,
}));
export const catalogSkills = definitions.flatMap(([categoryKey, , skills]) =>
  skills.map((key) => ({
    key: `${categoryKey}:${key}`,
    label: key
      .split("-")
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(" "),
    categoryKey,
    isActive: true,
  })),
);
export const catalogServices = definitions.flatMap(
  ([categoryKey, , , services]) =>
    services.map(([key, name, unit, skill]) => ({
      key,
      name,
      categoryKey,
      unit,
      skillKeys: [`${categoryKey}:${skill}`],
      isActive: true,
    })),
);
export const pricingUnits = [
  "job",
  "visit",
  "item",
  "hour",
  "sq_ft",
  "ac",
  "bathroom",
  "kitchen",
  "seat",
];
export const pricingModels = [
  "fixed",
  "starting",
  "per_unit",
  "quote_required",
];
export const catalogVersion = 1;

/** @type {Record<string, string[]>} */
export const catalogSearchAliases = {
  electrical: ["electrician", "electricians", "electrical"],
  plumbing: ["plumber", "plumbers", "plumbing"],
  ac: [
    "ac",
    "ac repair",
    "ac servicing",
    "air conditioner",
    "air conditioning",
  ],
  cleaning: ["cleaner", "cleaners", "cleaning", "cleaning services"],
  carpentry: ["carpenter", "carpenters", "carpentry"],
  painting: ["painter", "painters", "painting"],
  "water-purifier": ["ro", "ro repair", "water purifier"],
  "pest-control": ["pest", "pest control"],
};

const sourceUrl = "https://partner.urbancompany.com/patna";
const reference = (amount, unit, qualification) => ({
  amount,
  currency: "INR",
  unit,
  city: "Patna",
  sourceUrl,
  checkedAt: "2026-10-23",
  kind: "public_listing",
  qualification: `${qualification} Public listing reference only; scope, materials, minimum visit charges and taxes require confirmation. Provider sets its own price.`,
});
// Only matching tasks with an observed public price have a market reference.
export const suggestedPrices = {
  "switch-socket-replacement": reference(
    49,
    "item",
    "Switch/socket replacement listing.",
  ),
  "tap-repair": reference(
    49,
    "item",
    "Tap repair listing; replacement parts are not priced here.",
  ),
  "external-pvc-flush-repair": reference(
    99,
    "item",
    "External PVC flush tank repair listing.",
  ),
  "ac-foam-cleaning": reference(
    599,
    "ac",
    "Foam-jet AC service starting listing; not an installation or repair quotation.",
  ),
};
