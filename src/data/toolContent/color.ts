import type { ToolContent } from '../toolContentTypes';

/** Transcribed from the design handoff (`design-reference/Color Tool.dc.html`). */
export const colorContent: ToolContent = {
  aboutTitle: 'Color Palette Generator Online',
  aboutLead:
    'Paste a hex code, drag the picker, or hit random, and this tool breaks one color down into everything you need to use it: exact conversions across ten color models, five variation ramps, six harmonies, WCAG and APCA contrast, color-blindness simulation, the closest named colors, and a full light and dark interface palette.',
  aboutSupport:
    'Every calculation happens in OKLCH and OKLab — the perceptual space standardised in CSS Color 4 — then gets gamut-mapped back to sRGB by reducing chroma while lightness and hue hold. That is why the ramps here step evenly to the eye instead of collapsing into mud at the dark end. Free, no account, and nothing leaves your browser.',
  spec: {
    hook: 'OKLCH / OKLab',
    outputs: 'HEX, RGB, HSL, HSB, HWB, CMYK, OKLCH, OKLAB, LAB, LCH, XYZ',
    requires: 'Any modern browser — nothing to install',
    testedOn: 'CSS Color 4 reference values · sRGB',
  },

  whyTitle: 'Why this color tool is more useful than a generic palette generator',
  whyIntro:
    'Most color sites rotate a hue in HSL, print six swatches and call it a palette. HSL is a geometric trick on RGB, not a model of vision: its lightness value says a saturated yellow and a saturated blue are equally bright, which no human eye agrees with. Working in OKLCH fixes that, and it changes every ramp, harmony and generated theme on this page.',
  features: [
    {
      title: 'Perceptual maths, not HSL shortcuts',
      body: 'Mixing happens in OKLab and rotation in OKLCH, so a ten-step ramp actually reads as ten even steps and a triadic set keeps all three colors at the same visual weight.',
    },
    {
      title: 'Honest gamut mapping',
      body: 'Out-of-gamut results lose chroma gradually while hue and lightness are preserved, instead of being clipped per channel — the clipping that turns bright rotations into muddy near-duplicates elsewhere.',
    },
    {
      title: 'Two contrast standards side by side',
      body: 'WCAG 2.1 ratios for the audit you have to pass, and APCA Lc for what actually looks legible. Where they disagree you can see it, rather than trusting one number blindly.',
    },
    {
      title: 'A palette with roles, not just hues',
      body: 'Background, surface, border, text, muted text, primary, hover, secondary, accent, success, warning and danger — generated for light and dark, each one contrast-corrected against the surface it sits on.',
    },
    {
      title: 'A real vision model',
      body: 'Protanopia, deuteranopia, tritanopia and achromatopsia simulated with severity-dependent matrices in linear RGB, with a severity slider — not a red channel deleted in sRGB.',
    },
    {
      title: 'Numbers that don’t pretend',
      body: 'Similarity is reported as ΔE OK distance with a plain-language band. Temperature is labelled a perceptual heuristic, not Kelvin. CMYK is marked as an approximation without an ICC profile, because it is one.',
    },
  ],

  howTitle: 'How does the color tool work?',
  howIntro:
    'One pipeline drives every section on the page: your sRGB input is linearised, converted into a perceptual space, transformed there, then mapped back into sRGB for display.',
  steps: [
    {
      title: 'Give it a color',
      body: 'Type or paste a hex code, drag inside the saturation square, or move the hue slider. Three and six digit hex both parse.',
    },
    {
      title: 'It converts to OKLCH',
      body: 'sRGB is linearised, taken to XYZ and OKLab, then expressed as lightness, chroma and hue — the form every transformation here needs.',
    },
    {
      title: 'Transform, then map back',
      body: 'Ramps mix toward black, white or grey; harmonies rotate hue; theme roles walk lightness. Anything outside sRGB loses chroma until it fits.',
    },
    {
      title: 'Check and copy',
      body: 'Contrast is measured on the results, not assumed. Hover any swatch for its hex, click to copy it to your clipboard.',
    },
  ],
  example: {
    title: 'Worked example — the conversion pipeline',
    intro:
      'Every value on this page comes out of these four steps. Gamma is removed first, because averaging gamma-encoded numbers is what makes naive blends look dirty.',
    code: `HEX  #E1706D
 ↓   parse to sRGB 0–1
sRGB 0.882, 0.439, 0.427
 ↓   remove gamma (piecewise, per sRGB spec)
LIN  0.753, 0.162, 0.153
 ↓   matrix to XYZ, then to OKLab
OKL  L 0.676  a 0.130  b 0.056
 ↓   polar form
LCH  oklch(67.6% 0.142 23.1)
 ↓   transform, then reduce chroma if outside sRGB
OUT  a hex you can paste anywhere`,
    note:
      'The W3C publishes reference code for all of these conversions, gamut mapping and color difference formulas, which is what the maths here follows.',
  },
  refLinks: [
    {
      href: 'https://www.w3.org/TR/css-color-4/',
      title: 'CSS Color Module Level 4',
      description: 'The specification that standardises OKLCH, LAB, LCH and gamut mapping, with reference code.',
    },
    {
      href: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
      title: 'WCAG 2.1 — Contrast (Minimum)',
      description: 'Where the 4.5:1, 3:1 and 7:1 thresholds come from, and what counts as large text.',
    },
    {
      href: 'https://git.apcacontrast.com/documentation/APCAeasyIntro',
      title: 'APCA — an introduction',
      description: 'The perceptual contrast method drafted for WCAG 3, and how to read an Lc value.',
    },
    {
      href: 'https://bottosson.github.io/posts/oklab/',
      title: 'A perceptual color space for image processing',
      description: 'Björn Ottosson’s original write-up of OKLab, including the transformation matrices.',
    },
    {
      href: 'https://pubmed.ncbi.nlm.nih.gov/19834201/',
      title: 'Machado, Oliveira & Fernandes (2009)',
      description: 'The physiologically-based color-vision deficiency model the simulator uses.',
    },
    {
      href: 'https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch',
      title: 'oklch() — MDN',
      description: 'Browser support and syntax for using OKLCH directly in CSS.',
    },
  ],

  faqTitle: 'Color science — frequently asked questions',
  faqIntro: 'The questions that come up most often about how these numbers are calculated.',
  faqs: [
    {
      question: 'What is OKLCH, and why use it instead of HSL?',
      answer:
        'OKLCH describes a color as perceptual lightness, chroma and hue. HSL describes the same color as a geometric position inside the RGB cube, which is why HSL calls a saturated yellow and a saturated blue equally light when your eye sees a huge difference. Because OKLCH lightness matches perception, a ramp built by stepping lightness looks evenly spaced — and that is the difference you can see in the Variations section above.',
    },
    {
      question: 'Why do the harmony colors here differ from other color sites?',
      answer:
        'Two reasons. The rotation happens on the OKLCH hue circle rather than the HSL one, so equal angles are equal perceptual steps. And when a rotation lands outside what sRGB can display, chroma is reduced gradually instead of each channel being clipped. Clipping is what produces those slightly muddy, oddly matched sets you see elsewhere.',
    },
    {
      question: 'WCAG says my color fails but APCA says it is fine. Which do I follow?',
      answer:
        'If you have a legal or contractual obligation, follow WCAG 2.1 — it is the standard being audited today. APCA is the draft method for WCAG 3 and models legibility more accurately, especially for light text on dark backgrounds, where WCAG 2.1 is known to be over-generous. Use APCA to make the better design decision and WCAG to pass the audit.',
    },
    {
      question: 'Why is the CMYK value marked as an approximation?',
      answer:
        'A screen color has no single correct CMYK equivalent. The real conversion depends on the press, the ink, the paper and an ICC profile for that combination. The figures here use the standard naive formula, which is fine for a rough idea and wrong for a print run — get the separation from your printer.',
    },
    {
      question: 'What does ΔE OK actually measure?',
      answer:
        'It is the straight-line distance between two colors in OKLab — the closest simple number to “how different do these look”. Roughly: under 0.02 is effectively the same color, under 0.05 is a difference you would only notice side by side, and past 0.2 they read as separate colors. It is deliberately shown as a raw distance rather than a percentage, because a “95% similar” score is a marketing number, not a unit.',
    },
    {
      question: 'Is color temperature here the same as Kelvin?',
      answer:
        'No, and it is labelled as a heuristic for that reason. Kelvin color temperature describes light sources and white points, not arbitrary surface colors. The temperature ramp above pulls the hue toward a warm target near 55° or a cool target near 250°, which is what designers usually mean by warming or cooling a color.',
    },
  ],

  related: [
    { id: 'theme-json', note: 'Turn the generated palette into a block theme’s colour presets.' },
    { id: 'child-theme', note: 'Ship the palette in a child theme with its own theme.json.' },
    { id: 'theme-support', note: 'Register an editor colour palette alongside the rest of your theme flags.' },
    { id: 'default-headers', note: 'Pair a header image with the palette you just built.' },
    { id: 'enqueue', note: 'Load the CSS custom properties this palette becomes.' },
    { id: 'block-pattern', note: 'Build patterns that use the palette’s named colour slugs.' },
  ],
};
