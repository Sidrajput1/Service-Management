import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { getPublicSocialLinks } from "@/lib/public-social-links";

const icons = {
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
};

export function SocialLinks() {
  const links = getPublicSocialLinks();
  if (!links.length) return null;

  return (
    <section aria-labelledby="footer-social-title" className="mt-6">
      <h3 id="footer-social-title" className="text-sm font-bold">
        Follow Servizato
      </h3>
      <nav aria-label="Social media" className="mt-3 flex flex-wrap gap-2">
        {links.map(({ id, label, href }) => {
          const Icon = icons[id];
          return (
            <a
              key={id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Servizato on ${label} (opens in a new tab)`}
              title={label}
              className="inline-flex size-11 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:border-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <Icon aria-hidden="true" className="size-5" />
            </a>
          );
        })}
      </nav>
    </section>
  );
}
