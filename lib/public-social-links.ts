export type SocialPlatform = "facebook" | "twitter" | "linkedin" | "instagram";
type SocialUrls = Partial<Record<SocialPlatform, string>>;

const platforms = [
  {
    id: "facebook",
    label: "Facebook",
    hosts: ["facebook.com", "www.facebook.com"],
  },
  {
    id: "twitter",
    label: "Twitter / X",
    hosts: ["twitter.com", "www.twitter.com", "x.com", "www.x.com"],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    hosts: ["linkedin.com", "www.linkedin.com"],
  },
  {
    id: "instagram",
    label: "Instagram",
    hosts: ["instagram.com", "www.instagram.com"],
  },
] as const;

// Empty until official profile URLs are supplied and approved. No guessed profiles.
const configuredUrls: SocialUrls = {
  facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL || "",
  twitter: process.env.NEXT_PUBLIC_SOCIAL_TWITTER_URL || "",
  linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL || "",
  instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL || "",
};

export function getPublicSocialLinks(input: SocialUrls = configuredUrls) {
  return platforms.flatMap(({ id, label, hosts }) => {
    const value = input[id]?.trim();
    if (!value) return [];
    try {
      const url = new URL(value);
      if (
        url.protocol !== "https:" ||
        !(hosts as readonly string[]).includes(url.hostname) ||
        url.username ||
        url.password ||
        url.port ||
        url.search ||
        url.hash ||
        !/^\/[a-z\d._/-]+$/i.test(url.pathname) ||
        /^\/(?:share|sharer(?:\.php)?|intent|login|signup|accounts)(?:\/|$)/i.test(
          url.pathname,
        ) ||
        /(?:^|\/)(?:placeholder|example|your[-_](?:profile|handle)|profile[-_]url|tbd|todo)(?:\/|$)/i.test(
          url.pathname,
        )
      )
        return [];
      return [{ id, label, href: url.href }];
    } catch {
      return [];
    }
  });
}
