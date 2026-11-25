import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./technician-workflow-fixture.mjs";
export function renderPasswordUi({ kind = "forgot", states = {}, post } = {}) {
  const forms = [],
    controls = [],
    writes = [],
    effects = [],
    calls = [];
  let index = 0;
  const hooks = {
    ...React,
    useState(initial) {
      const position = index++;
      const [value] = React.useState(
        Object.hasOwn(states, position) ? states[position] : initial,
      );
      return [
        value,
        (next) =>
          writes.push({
            position,
            value: typeof next === "function" ? next(value) : next,
          }),
      ];
    },
    useEffect(callback) {
      effects.push(callback);
    },
  };
  const runtime = { ...jsxRuntime };
  for (const key of ["jsx", "jsxs"])
    runtime[key] = (type, props, id) => {
      if (type === "form") forms.push(props);
      if (props?.onClick || props?.onChange) controls.push(props);
      return jsxRuntime[key](type, props, id);
    };
  const modules = {
    react: hooks,
    "react/jsx-runtime": runtime,
    "next/link": ({ children, ...props }) =>
      React.createElement("a", props, children),
    "next/navigation": { useSearchParams: () => new URLSearchParams() },
    "@/components/BrandLogo": {
      BrandLogo: () => React.createElement("span", null, "Servizato"),
    },
    "@/components/SiteHeader": {
      SiteHeader: () => React.createElement("header", null, "Servizato"),
    },
    "@/components/SiteFooter": {
      SiteFooter: () => React.createElement("footer", null, "Servizato"),
    },
    "@/components/provider/ProviderUi": {
      Feedback: ({ message }) =>
        message ? React.createElement("p", null, message) : null,
    },
    "@/lib/push-client": {
      signOut: async (value) => calls.push({ signOut: value }),
    },
    "@/lib/api": {
      default: {
        post: async (url, payload) => {
          calls.push({ url, payload });
          return post
            ? post(url, payload)
            : { data: { success: true, signInRequired: true } };
        },
      },
      __esModule: true,
    },
    "@/components/ui/dialog": {
      Dialog: ({ open, children }) =>
        open ? React.createElement(React.Fragment, null, children) : null,
      DialogContent: ({ children }) =>
        React.createElement("section", { role: "dialog" }, children),
      DialogTitle: ({ children }) => React.createElement("h2", null, children),
      DialogDescription: ({ children }) =>
        React.createElement("p", null, children),
    },
  };
  modules["@/lib/utils"] = loadTs("lib/utils.ts", modules);
  for (const name of ["input", "button"])
    modules[`@/components/ui/${name}`] = loadTs(
      `components/ui/${name}.tsx`,
      modules,
    );
  modules["@/lib/password-policy"] = loadTs("lib/password-policy.ts", modules);
  modules["@/lib/password-client"] = loadTs("lib/password-client.ts", modules);
  modules["@/lib/booking-redirect"] = loadTs(
    "lib/booking-redirect.ts",
    modules,
  );
  modules["@/components/auth/PasswordInput"] = loadTs(
    "components/auth/PasswordInput.tsx",
    modules,
  );
  const loaded =
    kind === "provider"
      ? loadTs("components/auth/ProviderPasswordSettings.tsx", modules)
          .ProviderPasswordSettings
      : kind === "signin"
        ? loadTs("components/auth/AuthExperience.tsx", modules).AuthExperience
        : loadTs("components/auth/PasswordRecoveryPage.tsx", modules)
            .PasswordRecoveryPage;
  const html = renderToStaticMarkup(
    React.createElement(loaded, { reset: kind === "reset" }),
  );
  return { html, forms, controls, writes, effects, calls };
}
