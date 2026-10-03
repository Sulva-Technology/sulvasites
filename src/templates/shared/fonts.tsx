/**
 * Loads a template's Google Fonts with a <link> (React hoists it into <head>).
 * CSS `@import` is unreliable here: all template stylesheets are bundled into one
 * chunk and browsers ignore any @import that isn't at the very top of it.
 */
export default function TemplateFonts({ href }: { href: string }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={href} precedence="default" />
    </>
  );
}
