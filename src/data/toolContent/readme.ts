import type { ToolContent } from '../toolContentTypes';

export const readmeContent: ToolContent = {
  aboutTitle: 'WordPress readme.txt Generator Online',
  aboutLead:
    'Readme Studio is a WordPress readme.txt generator built as an editor rather than a form: metadata at the top, then Description, Installation, Screenshots, FAQ, Changelog and Upgrade Notice as sections you fill in, reorder and switch off. The output is a plugin-directory `readme.txt` in the exact format wordpress.org parses — the header block, the `== Section ==` headings, the `= Subheading =` lines and the restricted markdown it accepts.',
  aboutSupport:
    'Beside the editor is a live approximation of your plugin\'s directory listing, so you can see how the short description reads under the title, how the FAQ renders and where a changelog entry lands, before anything is committed. Already have a `readme.txt`? Import it and it is parsed straight back into editable sections. Free, no account, and the file never leaves your browser.',
  spec: {
    hook: 'readme.txt — the wordpress.org plugin directory format',
    outputs: 'A `readme.txt` for the plugin directory, plus a project JSON you can re-import later',
    requires: 'Nothing to install; the format applies to any plugin hosted on wordpress.org',
  },

  whyTitle: 'Why Readme Studio beats writing a WordPress readme.txt by hand',
  whyIntro:
    'The format looks like plain text but is strict in ways that only bite after you commit. A `Stable tag` that disagrees with your changelog can make a release unavailable to existing users. More than five tags are ignored. An HTML tag the parser rejects silently drops out of your listing. All of that is checkable, so this checks it.',
  features: [
    {
      title: 'A live directory listing preview',
      body: 'Every keystroke re-renders an approximation of the wordpress.org plugin page — title, short description, the section tabs, FAQ accordions and changelog entries — with an expand button when you want to inspect it full width.',
    },
    {
      title: 'Stable tag and changelog kept honest',
      body: 'If the newest changelog version does not match `Stable tag`, that is reported as an error with a one-click sync. An upgrade notice that references a version which is not in the changelog is an error too, because the directory has nothing to attach it to.',
    },
    {
      title: 'The directory\'s own content rules, enforced',
      body: '`div`, `script`, `style` and `iframe` tags, inline `style="…"` attributes, `javascript:` URLs and base64-embedded images are each flagged as errors. Placeholder text ("Lorem ipsum", "TODO") and malformed markdown links are warnings, because reviewers notice both.',
    },
    {
      title: 'Metadata checks that reflect real limits',
      body: 'A short description over 150 characters is flagged with the exact overage, duplicate tags and contributors get a dedupe fix, and a `Requires at least` higher than `Tested up to` is an error — a combination that reads as broken on the listing page.',
    },
    {
      title: 'A real editor for the prose',
      body: 'Description and Installation are built from paragraph, subheading and video blocks with a rich-text toolbar — bold, italic, inline code, links and genuine bulleted or numbered lists — which serialise to the markdown subset readme.txt actually supports.',
    },
    {
      title: 'Import, export, and five starting points',
      body: 'Paste an existing `readme.txt` and it is parsed back into sections, blocks, FAQs and changelog entries, with anything unrecognised listed rather than silently dropped. Save and reload work as project JSON, and there are templates for a basic plugin, a WooCommerce extension, a block plugin and a utility plugin.',
    },
  ],

  howTitle: 'How does Readme Studio work?',
  howIntro: 'Four steps from an empty file to something you can commit to the plugin directory.',
  steps: [
    {
      title: 'Start from a template or an import',
      body: 'Pick one of the five starting points, or use Import to paste an existing `readme.txt` and carry on editing it here.',
    },
    {
      title: 'Fill in the header',
      body: 'Contributors, tags, donate link, Requires at least, Tested up to, Requires PHP, Stable tag, licence and the short description that appears under your plugin name — plus any custom header field you need.',
    },
    {
      title: 'Write the sections',
      body: 'Build Description and Installation from text blocks, add screenshots with descriptions, FAQ pairs, changelog versions and upgrade notices. Any section you do not need can be switched off.',
    },
    {
      title: 'Check, preview and export',
      body: 'Clear the Checks tab, look over the listing preview, then copy or download `readme.txt` — or export the project JSON so the next release starts where this one finished.',
    },
  ],
  example: {
    title: 'Worked example — a readme.txt the directory will parse',
    intro:
      'The output for a small plugin with Description and Changelog enabled. The header block, the short description and the section headings are all in the exact positions the parser expects.',
    code: `=== Simple Notice Bar ===
Contributors: pluginauthor
Tags: notice, banner, admin
Requires at least: 6.3
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Display a dismissible announcement bar anywhere on your site.

== Description ==

Simple Notice Bar lets you add a clean, dismissible announcement banner to your site in seconds.

= Key features =

* **Dismissible banner:** Visitors can close the notice; their choice is remembered.
* **Custom colors:** Match the banner to your brand.

== Changelog ==

= 1.0.0 =

* Initial release.`,
    note:
      'The line directly under the header block is the short description — the one sentence shown beneath your plugin name in search results and on the listing page. It takes no markup and is truncated past roughly 150 characters.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/',
      title: 'How your readme.txt works — Plugin Handbook',
      description: 'The canonical description of every header field, section and the Stable tag mechanism.',
    },
    {
      href: 'https://wordpress.org/plugins/developers/readme-validator/',
      title: 'Official readme.txt validator',
      description: 'Paste the generated file here for wordpress.org\'s own verdict before you commit it.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/',
      title: 'Plugin assets — banners, icons and screenshots',
      description: 'Where screenshot files live and how their numbering matches the Screenshots section.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/',
      title: 'Detailed plugin guidelines',
      description: 'The rules a reviewer checks your listing and its claims against.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/',
      title: 'How to use Subversion — Plugin Handbook',
      description: 'How trunk, tags and the Stable tag interact when you publish a release.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/wordpress-org/plugin-developer-faq/',
      title: 'Plugin developer FAQ',
      description: 'Answers on directory listings, updates and what the readme controls.',
    },
  ],

  faqTitle: 'Plugin readme.txt — frequently asked questions',
  faqIntro: 'What plugin authors ask when preparing or updating a wordpress.org listing.',
  faqs: [
    {
      question: 'What does Stable tag do in readme.txt?',
      answer:
        'It tells the directory which version to serve. WordPress.org reads `/trunk/readme.txt` first, finds the `Stable tag`, then looks for `/tags/<that version>/` and uses the `readme.txt` in that folder for everything shown on your plugin page. So the readme inside the tagged folder must carry the same stable tag. Using `Stable tag: trunk` still works but is actively discouraged and is not allowed for new plugins.',
    },
    {
      question: 'Why has my plugin page not updated after I changed readme.txt?',
      answer:
        'Almost always because you edited the readme in `/trunk` while the `Stable tag` points at a folder in `/tags`. Once the stable tag names an existing tag, nothing in trunk is read for the listing — the description, FAQ and changelog all come from the tagged copy. Update the readme in that tag folder, or bump the stable tag to a newly tagged release.',
    },
    {
      question: 'How many tags can I use in a plugin readme?',
      answer:
        'One to five comma-separated terms, and only the first five are used. Tags unique to your own plugin are ignored, since nobody browses them, and using a competitor\'s plugin name as a tag is against the directory guidelines. Choose terms people actually search for the category of plugin you have written.',
    },
    {
      question: 'How long should the short description be?',
      answer:
        'No more than 150 characters, on the single line directly beneath the header block, with no markup. It is the sentence shown under your plugin name in directory search results and at the top of the listing page, and anything past the limit is cut off. Treat it as the one line that decides whether someone reads any further.',
    },
    {
      question: 'How do screenshots in readme.txt work?',
      answer:
        'The Screenshots section is a numbered list of captions, and each number maps to an image file named `screenshot-1.png`, `screenshot-2.png` and so on. Those files belong in the `/assets` directory of your SVN repository, not in the plugin folder itself, so they do not bloat the download. A caption with no matching file shows an empty slot, which is why an undescribed screenshot is flagged here.',
    },
    {
      question: 'Can I use HTML or full markdown in readme.txt?',
      answer:
        'Neither, quite. The directory parses a restricted markdown: `= Subheading =` lines, `*` and numbered lists, `**bold**`, `*italic*`, backtick code, four-space code blocks, blockquotes and `[text](url)` links. A few inline HTML tags survive, but `div`, `script`, `style` and `iframe`, inline CSS, `javascript:` URLs and base64 images are stripped or rejected — which is why the generator treats each of those as an error rather than a style preference.',
    },
  ],

  related: [
    { id: 'plugin-header', note: 'The Version in the plugin file has to agree with the Stable tag in this readme.' },
    { id: 'activation', note: 'The uninstall routine the directory guidelines expect a plugin to ship with.' },
    { id: 'hooks', note: 'The callbacks behind everything the Description section claims your plugin does.' },
    { id: 'enqueue', note: 'Versioned assets, so users on the update you just tagged get the right files.' },
    { id: 'settings-page', note: 'The screen your Installation section tells people to open after activating.' },
    { id: 'shortcode', note: 'Shortcode attributes are exactly the thing the FAQ section should document.' },
  ],
};
