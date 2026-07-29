import type { ToolContent } from '../toolContentTypes';

/** Transcribed and extended from the design handoff (`design-reference/Gradient Tool.dc.html`). */
export const gradientContent: ToolContent = {
  aboutTitle: 'CSS Gradient Generator Online',
  aboutLead:
    'The most advanced CSS gradient generator on the internet, and the only one that works in both directions: build linear, radial and conic gradients by dragging stops directly on the artwork, or paste any existing CSS gradient and get it back as a fully editable set of handles. Every stop carries its own alpha, the midpoint between any two stops is adjustable, and the result comes out as CSS, SVG, a Tailwind class or JSON — or downloads as a PNG or SVG at any size.',
  aboutSupport:
    'What you see on the canvas is the CSS being generated, not an approximation of it — the preview, the exported image and the copied code all come from the same stop list. Free, no account, and nothing leaves your browser.',
  spec: {
    hook: 'linear-gradient() / radial-gradient() / conic-gradient()',
    outputs: 'CSS, SVG, Tailwind, JSON, plus PNG and SVG downloads',
    requires: 'Any modern browser — nothing to install',
    testedOn: 'CSS Images 3 · CSS Color 4 · Chrome, Safari, Firefox',
  },

  whyTitle: 'Why this is the most advanced gradient generator available',
  whyIntro:
    'Most gradient sites give you two colour inputs, an angle slider and a copy button. That is fine until you need a third stop in a specific place, a transparent end for an image overlay, a ramp that does not go grey in the middle — or, most often of all, until you need to edit a gradient that already exists somewhere in your codebase. Those are the ordinary cases this tool is built around.',
  features: [
    {
      title: 'It works both ways — CSS to gradient, and back',
      body: 'Paste any `linear-gradient()`, `radial-gradient()` or `conic-gradient()` — a whole declaration, a bare function, or even this tool’s own Tailwind class — and it becomes editable handles on the canvas. Side keywords, every angle unit, radial size keywords, `px` stop positions, omitted positions and interpolation hints are all read back correctly. Almost every other generator is write-only.',
    },
    {
      title: 'Editing happens on the artwork',
      body: 'Stops are handles on the gradient axis itself. Drag an axis end to rotate, drag a stop to move it, drag the centre or either radius of a radial, click anywhere on the rail to add a stop already the colour it sits on. The numbers follow your hand rather than the other way round.',
    },
    {
      title: 'Alpha is a first-class value',
      body: 'Every stop has its own opacity, shown against a checkerboard so you can see it, and preserved through the CSS, SVG and PNG exports. Fades are written as the full colour at zero alpha rather than the `transparent` keyword, which is what stops them travelling through grey.',
    },
    {
      title: 'OKLab interpolation, with a real fallback',
      body: 'Blend in sRGB like every other tool, or in OKLab so complementary colours stop turning muddy halfway. Emit the modern one-line `in oklab` syntax, or a version sampled into twelve steps per pair that produces the same ramp in browsers that do not support it yet.',
    },
    {
      title: 'Midpoint control per pair',
      body: 'Push the halfway colour toward either end and the tool writes it as a CSS colour interpolation hint — a real part of the spec that almost no generator exposes, and the cleanest way to bias a two-stop ramp without inventing a third stop.',
    },
    {
      title: 'Banding and legibility taken seriously',
      body: 'Wide, low-contrast ramps band visibly on 8-bit displays; the grain option dithers them in the preview, in the PNG and as a CSS snippet you can keep. And because a gradient is usually a background, the tool samples along the ramp and reports the worst-case WCAG contrast for black and for white text.',
    },
  ],

  howTitle: 'How does the CSS gradient generator work?',
  howIntro:
    'A CSS gradient is a list of colours with positions along a line. Everything else — angle, shape, repetition — is how that line is laid over the box.',
  steps: [
    {
      title: 'Start from scratch or paste',
      body: 'Pick linear, radial or conic — or drop an existing gradient into the "Load a gradient" box and carry on editing it. Repeating tiles the whole ramp end to end.',
    },
    {
      title: 'Place the stops',
      body: 'Drag them on the canvas or the rail, click the rail to add one, and set each colour and alpha in the picker. The picker takes any CSS colour notation, and the dropper samples any pixel on your screen.',
    },
    {
      title: 'Shape the blend',
      body: 'Choose sRGB or OKLab interpolation, nudge the midpoint between any pair, and add grain if the ramp is wide enough to band.',
    },
    {
      title: 'Copy or download',
      body: 'Take the CSS, SVG, Tailwind value or JSON, or export a PNG or SVG at a preset or custom size, up to 3× scale.',
    },
  ],
  example: {
    title: 'Worked example — a three-stop scrim with a transparent end',
    intro:
      'The overlay pattern used on almost every hero image: solid at the bottom, gone by the middle. Note the third value in each colour — that is the alpha — and the bare percentage on its own line.',
    code: `.gradient {
	background-image: linear-gradient(
		0deg,
		rgb(18 16 12 / 0.85) 0%,
		38%,
		rgb(18 16 12 / 0.35) 55%,
		rgb(18 16 12 / 0) 100%
	);
}`,
    note:
      'The bare `38%` is a colour interpolation hint: it moves the halfway point of the first blend without adding a stop. That is the midpoint control in this tool, written the way the spec intends. Paste this whole block back into the "Load a gradient" box and you get the three handles and the moved midpoint back, exactly as they were.',
  },
  refLinks: [
    {
      href: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/gradient/linear-gradient',
      title: 'linear-gradient() on MDN',
      description: 'Angle keywords, stop syntax, and how the gradient line is sized against the box.',
    },
    {
      href: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/gradient/radial-gradient',
      title: 'radial-gradient() on MDN',
      description: 'Circle versus ellipse, explicit radii, and the closest-side and farthest-corner keywords.',
    },
    {
      href: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/gradient/conic-gradient',
      title: 'conic-gradient() on MDN',
      description: 'Sweeping gradients, the from angle, and the pie-chart and colour-wheel patterns.',
    },
    {
      href: 'https://www.w3.org/TR/css-images-3/#color-transition-hint',
      title: 'Colour transition hints — CSS Images 3',
      description: 'The specification for the midpoint syntax, including how the interpolation curve is derived.',
    },
    {
      href: 'https://www.w3.org/TR/css-color-4/#interpolation-space',
      title: 'Interpolation colour spaces — CSS Color 4',
      description: 'What `in oklab` changes, and the rules for interpolating alpha.',
    },
    {
      href: 'https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/linearGradient',
      title: '<linearGradient> on MDN',
      description: 'The SVG equivalent, including stop-opacity and gradient units — what the SVG export writes.',
    },
  ],

  faqTitle: 'CSS gradients — frequently asked questions',
  faqIntro: 'The problems that come up once a gradient leaves the design file.',
  faqs: [
    {
      question: 'Can I paste an existing CSS gradient in and edit it?',
      answer:
        'Yes — that is the half most generators are missing. Drop a whole `background-image:` declaration, a bare `linear-gradient(...)`, or a Tailwind arbitrary value into the "Load a gradient" box and every stop becomes a handle you can drag. It reads side keywords like `to top right`, angles in `deg`, `turn`, `rad` or `grad`, radial size keywords like `farthest-corner`, explicit radii, `from` angles on conic gradients, stop positions given in pixels, positions left out entirely (which CSS distributes evenly), and bare interpolation hints. Colours can be hex, `rgb()`, `hsl()`, `oklch()`, `color-mix()`, a colour name or `transparent`.',
    },
    {
      question: 'Why does my gradient turn gray in the middle?',
      answer:
        'Because it is being blended in sRGB. Halfway between two roughly opposite hues the channel averages cancel out and you get a desaturated middle. Switch interpolation to OKLab and the blend keeps its chroma, taking a path around the hue circle instead of straight through the middle of it. If you need it to work in older browsers, leave "Native in oklab" off and the tool writes the same ramp as sampled sRGB stops instead.',
    },
    {
      question: 'Why does fading to transparent go through gray?',
      answer:
        'Because `transparent` is shorthand for transparent *black*, so the colour is travelling toward black as it fades. Fade to the same colour at zero alpha instead — this tool always writes the full colour with an alpha of 0, which is why its fades stay clean. It is also why pasting a gradient that ends in `transparent` will show you a black end stop at 0% opacity: that is what the original actually meant.',
    },
    {
      question: 'What causes those visible stripes across a large gradient?',
      answer:
        'Banding. An 8-bit channel has 256 steps, and a wide, low-contrast ramp may need more distinct values than the distance provides, so it quantises into visible bands. The fixes are more contrast, a shorter ramp, or dithering — which is what the grain option does, both in the CSS (as a tiny inline SVG noise overlay) and in the exported PNG.',
    },
    {
      question: 'Should I use a CSS gradient or an exported image?',
      answer:
        'CSS whenever you can — it costs no bytes, scales to any size and stays sharp on any display. Export an image only when the gradient has to live somewhere CSS cannot reach: an email background, an Open Graph or social card, a slide deck, or an app icon. Note that conic gradients have no SVG equivalent, so those export as PNG only.',
    },
    {
      question: 'How do angles work in CSS gradients?',
      answer:
        'Zero degrees points to the top and the angle increases clockwise, so `90deg` goes to the right and `180deg` to the bottom. This trips people up because many other graphics systems measure from the right and go anticlockwise. The gradient line is also sized so the box corners land exactly on 0% and 100%, which is why a 45-degree gradient on a wide box is longer than the box is tall.',
    },
    {
      question: 'Can I put a gradient on text or a border?',
      answer:
        'Yes to both, and the "Try it on" panel shows each. Text needs `background-clip: text` with a transparent colour; borders need two backgrounds with different `background-clip` values, since `border-color` cannot take a gradient. Keep an eye on contrast for text — thin strokes lose the light end of a ramp first, which is what the legibility readout is warning you about.',
    },
    {
      question: 'How do I add this gradient to a WordPress block theme?',
      answer:
        'Register it as a preset in `theme.json` under `settings.color.gradients`, with a `slug`, a `name` and the `gradient` value you copied here. That puts it in the block editor’s gradient picker for every author on the site and generates a `--wp--preset--gradient--{slug}` custom property you can use in your own CSS. The theme.json generator in this library will write that block for you.',
    },
  ],

  related: [
    { id: 'color', note: 'Build the palette the gradient’s stops come from.' },
    { id: 'theme-json', note: 'Register this gradient as a block theme preset authors can pick.' },
    { id: 'theme-support', note: 'Add editor gradient presets alongside the rest of your theme flags.' },
    { id: 'child-theme', note: 'Somewhere safe to keep the CSS you just copied.' },
    { id: 'default-headers', note: 'Pair a header image with the gradient scrim over it.' },
    { id: 'widget', note: 'Widget areas with the wrapper markup your gradient styles hook onto.' },
  ],
};
