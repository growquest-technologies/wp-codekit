import type { ToolContent } from '../toolContentTypes';

export const themeJsonContent: ToolContent = {
  aboutTitle: 'theme.json Generator Online',
  aboutLead:
    'Build a valid version 3 `theme.json` from a palette, a type scale, a spacing scale and a layout width, and get the CSS custom properties WordPress will generate from it in the same view. Presets become `--wp--preset--color--{slug}` and `--wp--preset--font-size--{slug}` names you can use straight from a stylesheet, so the file doubles as your design-token source rather than being a black box.',
  aboutSupport:
    'The CSS vars tab lists every custom property the file produces, and the type scale is computed live from your base size and ratio so you can see the rendered px value of each step. Free to use, no account, and nothing you enter leaves the browser.',
  spec: {
    hook: 'theme.json at the theme root',
    outputs: 'A `theme.json` file, plus the generated CSS custom property list',
    requires: 'WordPress 6.6 or newer for schema version 3 (5.9+ for version 2)',
  },

  whyTitle: 'Why the theme.json generator beats editing the file by hand',
  whyIntro:
    'Nothing in `theme.json` throws an error. A colour value with a typo, a `contentSize` larger than `wideSize`, a heading font defined with no style layer that applies it — the file parses, WordPress loads it, and the result is quietly wrong in the editor. There is no hook and no PHP to debug. This generator applies the checks the format itself does not, and shows you the custom properties before you go and write CSS against names that do not exist.',
  features: [
    {
      title: 'Palette slugs validated as CSS names',
      body: 'The slug becomes the custom property name, so a missing slug is an error and a duplicate slug is an error — one property would overwrite the other. Colour values are checked for hex, `rgb()`, `hsl()`, `oklch()` or `var()` form.',
    },
    {
      title: 'A type scale you set by ratio, not by hand',
      body: 'Small through xx-large are computed from your base size and modular ratio and shown with their px equivalents, then written as `settings.typography.fontSizes`. A px base size is flagged, because it ignores the reader\'s browser setting.',
    },
    {
      title: 'The settings-versus-styles distinction made concrete',
      body: 'Naming a colour `base`/`background`, `contrast`/`text` or `primary`/`accent` wires it into the styles layer as the real background, text and link colour — not just an option in the picker. Missing either of the first two raises a warning.',
    },
    {
      title: 'Layout checks that catch a genuine ordering mistake',
      body: '`contentSize` and `wideSize` must both be CSS lengths, and a `contentSize` larger than `wideSize` is an error with a one-click swap, because wide alignment would render narrower than normal content.',
    },
    {
      title: 'Root padding and alignment kept consistent',
      body: 'Setting a root padding turns on `useRootPaddingAwareAlignments` and writes the left/right padding into `styles.spacing`, so full-width content still clears the viewport edge on phones. Leaving it empty is flagged with a `clamp()` suggestion.',
    },
    {
      title: 'Honest notes about the controls you enable',
      body: 'The custom colour picker alongside a curated palette, and arbitrary font sizes alongside a defined scale, both undo the consistency you just set up. Both are flagged as notes, along with the reminder that `appearanceTools` is a shorter way to enable border, colour, spacing and typography controls together.',
    },
  ],

  howTitle: 'How does the theme.json Generator work?',
  howIntro:
    'Four steps. The JSON and the CSS custom property list both update on every change, so you never wonder what a setting will produce.',
  steps: [
    {
      title: 'Define the palette',
      body: 'Add colours with a slug, a display name and a value. Slugs named base, contrast and primary are picked up automatically by the styles layer for background, text and link colour.',
    },
    {
      title: 'Set the typography',
      body: 'Choose a body font stack, an optional heading stack, a base size and a modular ratio. The five preset sizes are computed and shown in px so you can sanity-check the smallest one.',
    },
    {
      title: 'Set the layout and spacing',
      body: 'Give `contentSize` and `wideSize` real CSS lengths, choose how many spacing steps to generate, and set the root padding — a `clamp()` is the usual answer.',
    },
    {
      title: 'Choose the editor controls, then export',
      body: 'Turn individual controls on or off, add the heading, button and template-part layers, clear the Checks tab, then copy the JSON or the CSS variables.',
    },
  ],
  example: {
    title: 'Worked example — palette, layout and root padding',
    intro:
      'The colour and layout portion of a generated file, with objects collapsed onto single lines for brevity. The full output also carries the typography scale, the spacing steps and every control flag.',
    code: `{
  "$schema": "https://schemas.wp.org/trunk/theme.json",
  "version": 3,
  "settings": {
    "appearanceTools": true,
    "useRootPaddingAwareAlignments": true,
    "layout": { "contentSize": "720px", "wideSize": "1200px" },
    "color": {
      "defaultPalette": false,
      "palette": [
        { "slug": "base", "name": "Base", "color": "#FAF9F7" },
        { "slug": "contrast", "name": "Contrast", "color": "#26221C" },
        { "slug": "primary", "name": "Primary", "color": "#3858E9" }
      ]
    }
  },
  "styles": {
    "color": {
      "background": "var(--wp--preset--color--base)",
      "text": "var(--wp--preset--color--contrast)"
    },
    "spacing": {
      "padding": { "left": "clamp(1rem, 4vw, 2rem)", "right": "clamp(1rem, 4vw, 2rem)" }
    }
  }
}`,
    note:
      'Those three palette entries become `--wp--preset--color--base`, `--wp--preset--color--contrast` and `--wp--preset--color--primary`, which the CSS vars tab lists in full so your stylesheet can use them directly.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/block-editor/reference-guides/theme-json-reference/',
      title: 'theme.json reference — Block Editor Handbook',
      description: 'Every key the file accepts, per schema version, with defaults.',
    },
    {
      href: 'https://developer.wordpress.org/themes/core-concepts/global-settings-and-styles/',
      title: 'Global Settings and Styles — Theme Handbook',
      description: 'How settings and styles differ, and how the file is merged with core and the user\'s own changes.',
    },
    {
      href: 'https://schemas.wp.org/trunk/theme.json',
      title: 'theme.json JSON Schema',
      description: 'The schema URL the generated file points at, for editor autocompletion and validation.',
    },
    {
      href: 'https://developer.wordpress.org/block-editor/how-to-guides/themes/global-settings-and-styles/',
      title: 'Global settings & styles guide — Block Editor Handbook',
      description: 'Worked examples of presets, the custom properties they generate and block-level styles.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_get_global_settings/',
      title: 'wp_get_global_settings() — WordPress developer reference',
      description: 'Reading resolved theme.json settings from PHP, after core, theme and user layers are merged.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/add_theme_support/',
      title: 'add_theme_support() — WordPress developer reference',
      description: 'The PHP flags theme.json supersedes, and the few that still have no JSON equivalent.',
    },
  ],

  faqTitle: 'theme.json — frequently asked questions',
  faqIntro: 'The questions people ask when a theme.json change does not show up where they expected.',
  faqs: [
    {
      question: 'Does a child theme.json replace the parent\'s?',
      answer:
        'No, it is merged over it. WordPress resolves core defaults, then the parent theme, then the child theme, then the user\'s own Site Editor changes, with each layer overriding the one before at the level of individual keys. So a child `theme.json` only needs the keys it is actually changing — copying the parent\'s whole file across is the mistake that makes every future parent update invisible.',
    },
    {
      question: 'Which theme.json version should I use?',
      answer:
        'Version 3 is current and is what this generator emits. The number is not decorative: it changes how some defaults are interpreted, notably the default font size and spacing presets, so bumping it on an existing theme can shift rendering. If your parent theme declares a different version, WordPress applies the behaviour of the higher one, which is another reason to check the parent before changing yours.',
    },
    {
      question: 'Why is my theme.json colour not showing on the front end?',
      answer:
        'Because `settings.color.palette` only offers the colour, it does not apply it. A palette entry becomes a swatch in the picker and a `--wp--preset--color--{slug}` custom property; something still has to use it. Set the value under `styles` — `styles.color.background`, `styles.elements.link.color.text` and so on — referencing the property with `var(--wp--preset--color--slug)`.',
    },
    {
      question: 'Does my CSS override theme.json styles?',
      answer:
        'Yes, by default. Styles generated from `theme.json` are printed in the head before your theme\'s `style.css`, so an equal-specificity rule in your stylesheet wins. The exception is the user\'s own changes in the Site Editor: those are saved to a separate `wp_global_styles` post and printed later, so they beat both your theme.json and your stylesheet.',
    },
    {
      question: 'Can a classic theme use theme.json?',
      answer:
        'Yes. A classic (non-block) theme that ships a `theme.json` gets the palette, the font size presets, the spacing scale and the editor controls, and it stops WordPress applying its own default palette and sizes. You do not need block templates for any of that. It is the cleanest way to make the block editor match a classic theme\'s design.',
    },
    {
      question: 'What are the generated CSS custom properties called?',
      answer:
        'The naming is fully predictable: every preset becomes `--wp--preset--{category}--{slug}`, such as `--wp--preset--color--primary` or `--wp--preset--font-size--large`, and everything under `settings.custom` becomes `--wp--custom--{path}` with camelCase keys converted to dashes. Because those names are stable, `theme.json` works as a design-token file you can rely on from plain CSS.',
    },
  ],

  related: [
    { id: 'child-theme', note: 'A child theme.json is merged over the parent — the tool builds the whole child folder around it.' },
    { id: 'theme-support', note: 'The PHP feature flags theme.json replaces, and the handful it does not.' },
    { id: 'block-pattern', note: 'Register patterns that use the palette and spacing presets you just defined.' },
    { id: 'sidebar', note: 'What a classic theme uses where a block theme uses template parts.' },
    { id: 'nav-menu', note: 'Classic menu locations, for a hybrid theme that has not moved to the Navigation block.' },
    { id: 'enqueue', note: 'Loading a stylesheet that consumes the --wp--preset-- custom properties this file generates.' },
  ],
};
