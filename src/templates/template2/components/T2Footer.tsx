"use client";

import Link from "next/link";
import { buildEmailLink, buildTelLink } from "../utils";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import EditableText from "@/components/inline-editor/EditableText";

interface T2FooterProps {
  businessName: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  socials: Record<string, string>;
  logoUrl: string | null;
  baseUrl: string;
}

export default function T2Footer({
  businessName,
  tagline,
  address,
  phone,
  email,
  socials,
  logoUrl,
  baseUrl,
}: T2FooterProps) {
  const editor = useInlineEditor();

  // Get footer labels from socials (or use defaults)
  const footerLabels = (() => {
    const raw = (socials as Record<string, unknown>).footer_labels;
    if (raw && typeof raw === "object") return raw as Record<string, string>;
    return {} as Record<string, string>;
  })();
  const quickLinksLabel = footerLabels.quickLinks || "Quick Links";
  const contactLabel = footerLabels.contact || "Contact";

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName}
                className="h-10 w-auto mb-4"
              />
            ) : (
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                <EditableText
                  value={businessName}
                  onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
                  as="span"
                />
              </h3>
            )}
            {tagline && (
              <p className="text-sm text-gray-600 mb-4 max-w-md">
                <EditableText
                  value={tagline}
                  onCommit={(next) => editor?.updateProfileField?.("tagline", next)}
                  placeholder="Add a tagline..."
                />
              </p>
            )}
            {(socials.instagram ||
              socials.facebook ||
              socials.twitter ||
              socials.tiktok) && (
              <div className="flex gap-4">
                {socials.instagram && (
                  <a
                    href={socials.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Instagram"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                    </svg>
                  </a>
                )}
                {socials.facebook && (
                  <a
                    href={socials.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Facebook"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                    </svg>
                  </a>
                )}
                {socials.twitter && (
                  <a
                    href={socials.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Twitter"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </a>
                )}
                {socials.tiktok && (
                  <a
                    href={socials.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="TikTok"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              <EditableText
                value={quickLinksLabel}
                onCommit={(next) => {
                  const updatedSocials = {
                    ...socials,
                    footer_labels: {
                      ...footerLabels,
                      quickLinks: next,
                    },
                  };
                  editor?.updateProfileField?.("socials", updatedSocials);
                }}
              />
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href={`${baseUrl}/`}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href={`${baseUrl}/about`}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href={`${baseUrl}/contact`}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              <EditableText
                value={contactLabel}
                onCommit={(next) => {
                  const updatedSocials = {
                    ...socials,
                    footer_labels: {
                      ...footerLabels,
                      contact: next,
                    },
                  };
                  editor?.updateProfileField?.("socials", updatedSocials);
                }}
              />
            </h3>
            <ul className="space-y-3">
              {address && (
                <li className="text-sm text-gray-600">
                  <EditableText
                    value={address}
                    onCommit={(next) => editor?.updateProfileField?.("address", next)}
                    multiline
                  />
                </li>
              )}
              {phone && (
                <li>
                  <a
                    href={buildTelLink(phone)}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <EditableText
                      value={phone}
                      onCommit={(next) => editor?.updateProfileField?.("phone", next)}
                      style={{ display: "inline" }}
                    />
                  </a>
                </li>
              )}
              {email && (
                <li>
                  <a
                    href={buildEmailLink(email)}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <EditableText
                      value={email}
                      onCommit={(next) => editor?.updateProfileField?.("email", next)}
                      style={{ display: "inline" }}
                    />
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-200 pt-8">
          <p className="text-xs text-gray-500 text-center">
            &copy; {new Date().getFullYear()}{" "}
            <EditableText
              value={businessName}
              onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
              style={{ display: "inline" }}
            />
            . All rights reserved. Developed by{" "}
            <a
              href="https://sulvatech.com"
              target="_blank"
              rel="noreferrer"
              className="text-gray-600 hover:text-gray-900 underline underline-offset-2"
            >
              Sulvatech
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
