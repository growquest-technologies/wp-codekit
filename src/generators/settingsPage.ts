import { alignBlock, escPhp, slugify as baseSlugify, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type FieldType = 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'radio' | 'email' | 'url' | 'color';

export interface SettingsField {
  id: string;
  label: string;
  type: FieldType;
  section: string;
  def: string;
  description: string;
  placeholder: string;
  choices: string;
}

export interface SettingsSection {
  id: string;
  title: string;
  description: string;
}

export interface SettingsPage {
  pageTitle: string;
  menuTitle: string;
  slug: string;
  parent: string;
  customParent: string;
  capability: string;
  icon: string;
  position: string;
  prefix: string;
  textDomain: string;
  optionName: string;
  optionGroup: string;
  storage: 'array' | 'individual';
  codeStyle: 'procedural' | 'class';
  sections: SettingsSection[];
  fields: SettingsField[];
  tabbed: boolean;
  settingsErrors: boolean;
  resetButton: boolean;
  scopedAssets: boolean;
  showInRest: boolean;
  uninstall: boolean;
  capCheck: boolean;
}

export const PARENTS: [string, string][] = [
  ['top', 'Top-level menu'],
  ['options-general.php', 'Settings'],
  ['tools.php', 'Tools'],
  ['themes.php', 'Appearance'],
  ['plugins.php', 'Plugins'],
  ['users.php', 'Users'],
  ['upload.php', 'Media'],
  ['edit.php', 'Posts'],
  ['custom', 'Custom parent file…'],
];
export const PARENT_LABEL: Record<string, string> = Object.fromEntries(PARENTS);

export const CAPS: [string, string][] = [
  ['manage_options', 'manage_options — admins only'],
  ['edit_theme_options', 'edit_theme_options — editors of the theme'],
  ['manage_categories', 'manage_categories — editors'],
  ['edit_posts', 'edit_posts — contributors and up'],
  ['upload_files', 'upload_files — authors and up'],
  ['read', 'read — every logged-in user'],
];

export const ICONS = ['dashicons-admin-generic', 'dashicons-admin-settings', 'dashicons-admin-tools', 'dashicons-chart-bar', 'dashicons-cart', 'dashicons-groups', 'dashicons-shield', 'dashicons-cloud', 'dashicons-email-alt', 'dashicons-forms'];

export const FIELD_TYPES: [FieldType, string][] = [
  ['text', 'Text'], ['textarea', 'Textarea'], ['number', 'Number'], ['checkbox', 'Checkbox'],
  ['select', 'Select'], ['radio', 'Radio'], ['email', 'Email'], ['url', 'URL'], ['color', 'Colour'],
];

const SANITIZE: Record<FieldType, string> = { text: 'sanitize_text_field', textarea: 'sanitize_textarea_field', email: 'sanitize_email', url: 'esc_url_raw', number: 'absint', checkbox: 'rest_sanitize_boolean', select: 'sanitize_key', radio: 'sanitize_key', color: 'sanitize_hex_color' };
const REST_TYPE: Record<FieldType, string> = { text: 'string', textarea: 'string', email: 'string', url: 'string', number: 'integer', checkbox: 'boolean', select: 'string', radio: 'string', color: 'string' };

/** dash-style slug (menu slugs, section ids, etc — dashes are valid PHP string content) */
function slug(s: string): string {
  return baseSlugify(s);
}
/** underscore-only slug, safe to use as a PHP identifier fragment */
function phpName(s: string): string {
  return baseSlugify(s).replace(/-/g, '_');
}
function pascal(s: string): string {
  return String(s || '').split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('_');
}
function indent(text: string, depth: number): string {
  const pad = '\t'.repeat(depth);
  return text.split('\n').map((l) => (l ? pad + l : '')).join('\n');
}
/** matches the source's local `aligned()` helper: no indent baked in, caller wraps with indent() */
function aligned(pairs: [string, string][]): string {
  return alignBlock(pairs, '');
}

export interface ParsedChoice {
  value: string;
  label: string;
}
function parseChoices(str: string): ParsedChoice[] {
  return String(str || '')
    .split(',')
    .map((part) => {
      const p = part.trim();
      if (!p) return null;
      const i = p.indexOf(':');
      const v = slug(i >= 0 ? p.slice(0, i) : p);
      const l = i >= 0 ? p.slice(i + 1).trim() : p.charAt(0).toUpperCase() + p.slice(1);
      return v ? { value: v, label: l || v } : null;
    })
    .filter((x): x is ParsedChoice => x != null);
}
function defLiteral(f: SettingsField): string {
  if (f.type === 'checkbox') return String(f.def) === '1' || String(f.def).toLowerCase() === 'true' ? 'true' : 'false';
  if (f.type === 'number') return String(parseInt(f.def, 10) || 0);
  return "'" + escPhp(f.def || '') + "'";
}

export interface DerivedSettings {
  pre: string;
  slug: string;
  td: string;
  opt: string;
  group: string;
  cap: string;
  cls: string;
  isClass: boolean;
  arrayMode: boolean;
  isTop: boolean;
  parentFile: string;
  sections: SettingsSection[];
  fields: (SettingsField & { parsed: ParsedChoice[] })[];
}

export function derive(sp: SettingsPage): DerivedSettings {
  const pre = phpName(sp.prefix) || 'acme';
  const slugVal = slug(sp.slug) || pre + '-settings';
  const sections = sp.sections && sp.sections.length ? sp.sections : [{ id: 'general', title: 'General', description: '' }];
  const secIds = sections.map((s) => slug(s.id) || 'general');
  const fields = (sp.fields || []).map((f) => {
    const sec = slug(f.section);
    const id = phpName(f.id) || 'field';
    return { ...f, id, section: secIds.indexOf(sec) >= 0 ? sec : secIds[0], parsed: parseChoices(f.choices) };
  });
  return {
    pre,
    slug: slugVal,
    td: slug(sp.textDomain) || slugVal,
    opt: phpName(sp.optionName) || pre + '_options',
    group: phpName(sp.optionGroup) || pre + '_group',
    cap: sp.capability || 'manage_options',
    cls: (pascal(sp.prefix || 'Acme') || 'Acme') + '_Settings',
    isClass: sp.codeStyle === 'class',
    arrayMode: sp.storage !== 'individual',
    isTop: sp.parent === 'top',
    parentFile: sp.parent === 'custom' ? sp.customParent || 'options-general.php' : sp.parent,
    sections: sections.map((s, i) => ({ id: secIds[i], title: s.title || 'Section', description: s.description || '' })),
    fields,
  };
}

export function positionNote(position: string): string {
  const p = parseInt(position, 10);
  if (isNaN(p)) return 'Appended to the bottom of the menu.';
  if (p < 5) return 'Above Posts — very aggressive.';
  if (p <= 25) return 'In among the core content menus.';
  if (p <= 65) return 'Below the content menus, above Appearance.';
  if (p <= 100) return 'The conventional home for plugin settings.';
  return 'Below Settings, near the bottom.';
}

export function placementNote(sp: SettingsPage): string {
  const d = derive(sp);
  return d.isTop
    ? 'Appears as its own sidebar item. The first submenu item repeats the page, so many plugins rename it with a second add_submenu_page() call.'
    : 'Appears under ' + (PARENT_LABEL[sp.parent] || d.parentFile) + '. Submenu pages inherit the parent capability check as well as their own.';
}

export function storageNote(sp: SettingsPage): string {
  const d = derive(sp);
  return d.arrayMode
    ? 'Every field lives in one row: ' + d.opt + '. One register_setting() call, one sanitiser, one row to delete on uninstall.'
    : 'Each field gets its own option (' + d.pre + '_field_name) with a core sanitise callback — easy to read with get_option(), heavier on autoload.';
}

interface CodeBlock {
  name: string;
  params: string;
  doc: string;
  body: string;
  hook?: string;
}

export function buildCode(sp: SettingsPage, mode: OutputMode): string {
  const d = derive(sp);
  const pre = d.pre, td = d.td, isClass = d.isClass, arrayMode = d.arrayMode;
  const t = (s: string) => "__( '" + escPhp(s) + "', '" + td + "' )";
  const cb = (m: string) => (isClass ? "array( $this, '" + m + "' )" : "'" + pre + '_' + m + "'");
  const call = (m: string) => (isClass ? '$this->' + m : pre + '_' + m) + '()';
  const secId = (id: string) => pre + '_section_' + phpName(id);
  const pageFor = (id: string) => (sp.tabbed ? d.slug + '-' + slug(id) : d.slug);
  const optFor = (f: SettingsField) => pre + '_' + f.id;
  const blocks: CodeBlock[] = [];
  const usedTypes: Partial<Record<FieldType, boolean>> = {};
  d.fields.forEach((f) => {
    usedTypes[f.type] = true;
  });

  if (arrayMode || sp.resetButton) {
    blocks.push({
      name: 'default_options',
      params: '',
      doc: '/**\n * Default values for every field.\n *\n * @return array\n */\n',
      body: d.fields.length
        ? 'return array(\n' + indent(aligned(d.fields.map((f) => [f.id, defLiteral(f)] as [string, string])), 1) + '\n);'
        : 'return array();',
    });
  }

  if (arrayMode) {
    blocks.push({
      name: 'get_options',
      params: '',
      doc: '/**\n * Saved options, merged over the defaults so no key is ever missing.\n *\n * @return array\n */\n',
      body: "return wp_parse_args( (array) get_option( '" + d.opt + "', array() ), " + call('default_options') + ' );',
    });
  }

  const menuArgs = [t(sp.pageTitle || 'Settings'), t(sp.menuTitle || sp.pageTitle || 'Settings'), "'" + escPhp(d.cap) + "'", "'" + escPhp(d.slug) + "'", cb('render_settings_page')];
  let menuCall: string;
  if (d.isTop) {
    menuArgs.push("'" + escPhp(sp.icon || 'dashicons-admin-generic') + "'");
    if (String(sp.position || '').trim()) menuArgs.push(String(parseInt(sp.position, 10) || 80));
    menuCall = 'add_menu_page(\n' + indent(menuArgs.join(',\n'), 1) + '\n);';
  } else {
    menuCall = 'add_submenu_page(\n' + indent(["'" + escPhp(d.parentFile) + "'"].concat(menuArgs).join(',\n'), 1) + '\n);';
  }
  blocks.push({
    name: 'add_settings_page',
    params: '',
    hook: 'admin_menu',
    doc: '/**\n * Add the page to the admin menu.\n */\n',
    body: sp.scopedAssets
      ? isClass
        ? '$this->hook = ' + menuCall
        : '$hook = ' + menuCall + '\n\n' + pre + '_settings_hook( $hook );'
      : menuCall,
  });

  if (sp.scopedAssets && !isClass) {
    blocks.push({
      name: 'settings_hook',
      params: '$hook = null',
      doc: '/**\n * Remember the screen hook suffix add_menu_page() handed back.\n *\n * @param string|null $hook Hook suffix to store, or null to read it.\n * @return string\n */\n',
      body: "static $stored = '';\n\nif ( null !== $hook ) {\n\t$stored = (string) $hook;\n}\n\nreturn $stored;",
    });
  }

  let reg = '';
  if (arrayMode) {
    const regPairs: [string, string][] = [['type', "'array'"], ['sanitize_callback', cb('sanitize_options')], ['default', call('default_options')]];
    if (sp.showInRest) {
      const props: [string, string][] = d.fields.map((f) => [f.id, "array( 'type' => '" + REST_TYPE[f.type] + "' )"]);
      regPairs.push([
        'show_in_rest',
        'array(\n' + indent("'schema' => array(\n" + indent("'type'       => 'object',\n'properties' => array(\n" + indent(aligned(props), 1) + '\n),', 1) + '\n),', 1) + '\n)',
      ]);
    } else {
      regPairs.push(['show_in_rest', 'false']);
    }
    reg += 'register_setting(\n' + indent("'" + escPhp(d.group) + "',\n'" + escPhp(d.opt) + "',\narray(\n" + indent(aligned(regPairs), 1) + '\n)', 1) + '\n);\n';
  } else {
    d.fields.forEach((f) => {
      reg +=
        'register_setting(\n' +
        indent(
          "'" + escPhp(d.group) + "',\n'" + optFor(f) + "',\narray(\n" +
            indent(aligned([['type', "'" + REST_TYPE[f.type] + "'"], ['sanitize_callback', "'" + SANITIZE[f.type] + "'"], ['default', defLiteral(f)], ['show_in_rest', sp.showInRest ? 'true' : 'false']]), 1) +
            '\n)',
          1
        ) +
        '\n);\n';
    });
  }
  d.sections.forEach((s) => {
    reg += '\nadd_settings_section(\n' + indent("'" + secId(s.id) + "',\n" + t(s.title) + ',\n' + cb('render_section') + ",\n'" + pageFor(s.id) + "'", 1) + '\n);\n';
    d.fields
      .filter((f) => f.section === s.id)
      .forEach((f) => {
        const argPairs: [string, string][] = [['key', "'" + escPhp(f.id) + "'"], ['type', "'" + f.type + "'"], ['label_for', "'" + escPhp(f.id) + "'"], ['default', defLiteral(f)]];
        if (!arrayMode) argPairs.push(['option', "'" + optFor(f) + "'"]);
        argPairs.push(['placeholder', "'" + escPhp(f.placeholder || '') + "'"]);
        argPairs.push(['description', f.description ? t(f.description) : "''"]);
        argPairs.push(['choices', f.parsed.length ? 'array(\n' + indent(aligned(f.parsed.map((c) => [c.value, t(c.label)] as [string, string])), 1) + '\n)' : 'array()']);
        reg += '\nadd_settings_field(\n' + indent("'" + escPhp(f.id) + "',\n" + t(f.label || f.id) + ',\n' + cb('render_field') + ",\n'" + pageFor(s.id) + "',\n'" + secId(s.id) + "',\narray(\n" + indent(aligned(argPairs), 1) + '\n)', 1) + '\n);\n';
      });
  });
  blocks.push({
    name: 'register_settings',
    params: '',
    hook: 'admin_init',
    doc: '/**\n * Register the setting, its sections and its fields.\n */\n',
    body: reg.replace(/\n+$/, ''),
  });

  if (arrayMode) {
    const lines: string[] = [];
    const w = d.fields.reduce((m, f) => Math.max(m, f.id.length), 0);
    const pad = (s: string, width: number) => s + ' '.repeat(Math.max(0, width - s.length));
    d.fields.forEach((f) => {
      const lhs = pad("$output['" + f.id + "']", 11 + w);
      const key = "$input['" + f.id + "']";
      if (f.type === 'checkbox') lines.push(lhs + ' = ! empty( ' + key + ' );');
      else if (f.type === 'select' || f.type === 'radio')
        lines.push(lhs + ' = isset( ' + key + ' ) && in_array( ' + key + ', array( ' + f.parsed.map((c) => "'" + c.value + "'").join(', ') + ' ), true ) ? sanitize_key( ' + key + ' ) : ' + defLiteral(f) + ';');
      else if (f.type === 'color') lines.push(lhs + ' = isset( ' + key + ' ) && sanitize_hex_color( ' + key + ' ) ? sanitize_hex_color( ' + key + ' ) : ' + defLiteral(f) + ';');
      else lines.push(lhs + ' = isset( ' + key + ' ) ? ' + SANITIZE[f.type] + '( ' + key + ' ) : ' + defLiteral(f) + ';');
    });
    blocks.push({
      name: 'sanitize_options',
      params: '$input',
      doc: '/**\n * Sanitise the submitted values. Anything not listed here never reaches the database.\n *\n * @param mixed $input Raw value from the form.\n * @return array\n */\n',
      body: '$input  = (array) $input;\n$output = ' + call('default_options') + ';\n\n' + (lines.length ? lines.join('\n') + '\n\n' : '') + 'return $output;',
    });
  }

  blocks.push({
    name: 'render_section',
    params: '$args',
    doc: '/**\n * Print the blurb under a section heading.\n *\n * @param array $args Section arguments from add_settings_section().\n */\n',
    body:
      '$descriptions = array(\n' +
      indent(aligned(d.sections.map((s) => [secId(s.id), s.description ? t(s.description) : "''"] as [string, string])), 1) +
      "\n);\n\nif ( ! empty( $descriptions[ $args['id'] ] ) ) {\n\techo '<p>' . esc_html( $descriptions[ $args['id'] ] ) . '</p>';\n}",
  });

  let fieldBody = arrayMode
    ? '$options = ' + call('get_options') + ";\n$key     = $args['key'];\n$name    = '" + d.opt + "[' . $key . ']';\n$value   = isset( $options[ $key ] ) ? $options[ $key ] : $args['default'];"
    : "$key   = $args['key'];\n$name  = $args['option'];\n$value = get_option( $args['option'], $args['default'] );";
  const cases: string[] = [];
  if (usedTypes.textarea) cases.push("case 'textarea':\n\tprintf(\n\t\t'<textarea id=\"%1$s\" name=\"%2$s\" rows=\"5\" class=\"large-text code\" placeholder=\"%4$s\">%3$s</textarea>',\n\t\tesc_attr( $key ),\n\t\tesc_attr( $name ),\n\t\tesc_textarea( $value ),\n\t\tesc_attr( $args['placeholder'] )\n\t);\n\tbreak;");
  if (usedTypes.checkbox) cases.push("case 'checkbox':\n\tprintf(\n\t\t'<input type=\"checkbox\" id=\"%1$s\" name=\"%2$s\" value=\"1\"%3$s />',\n\t\tesc_attr( $key ),\n\t\tesc_attr( $name ),\n\t\tchecked( (bool) $value, true, false )\n\t);\n\tbreak;");
  if (usedTypes.select) cases.push("case 'select':\n\techo '<select id=\"' . esc_attr( $key ) . '\" name=\"' . esc_attr( $name ) . '\">';\n\tforeach ( $args['choices'] as $choice => $label ) {\n\t\tprintf(\n\t\t\t'<option value=\"%1$s\"%2$s>%3$s</option>',\n\t\t\tesc_attr( $choice ),\n\t\t\tselected( $value, $choice, false ),\n\t\t\tesc_html( $label )\n\t\t);\n\t}\n\techo '</select>';\n\tbreak;");
  if (usedTypes.radio) cases.push("case 'radio':\n\tforeach ( $args['choices'] as $choice => $label ) {\n\t\tprintf(\n\t\t\t'<label><input type=\"radio\" name=\"%1$s\" value=\"%2$s\"%3$s /> %4$s</label><br />',\n\t\t\tesc_attr( $name ),\n\t\t\tesc_attr( $choice ),\n\t\t\tchecked( $value, $choice, false ),\n\t\t\tesc_html( $label )\n\t\t);\n\t}\n\tbreak;");
  cases.push("default:\n\tprintf(\n\t\t'<input type=\"%1$s\" id=\"%2$s\" name=\"%3$s\" value=\"%4$s\" class=\"regular-text\" placeholder=\"%5$s\" />',\n\t\tesc_attr( $args['type'] ),\n\t\tesc_attr( $key ),\n\t\tesc_attr( $name ),\n\t\tesc_attr( $value ),\n\t\tesc_attr( $args['placeholder'] )\n\t);\n\tbreak;");
  fieldBody += "\n\nswitch ( $args['type'] ) {\n" + indent(cases.join('\n\n'), 1) + "\n}\n\nif ( ! empty( $args['description'] ) ) {\n\techo '<p class=\"description\">' . esc_html( $args['description'] ) . '</p>';\n}";
  blocks.push({
    name: 'render_field',
    params: '$args',
    doc: '/**\n * Print one field. Every type routes through here so escaping lives in one place.\n *\n * @param array $args Field arguments from add_settings_field().\n */\n',
    body: fieldBody,
  });

  let page = '';
  if (sp.capCheck) page += "if ( ! current_user_can( '" + escPhp(d.cap) + "' ) ) {\n\treturn;\n}\n\n";
  if (sp.tabbed) {
    page += '$tabs = array(\n' + indent(aligned(d.sections.map((s) => [s.id, t(s.title)] as [string, string])), 1) + '\n);\n\n';
    page += "$active_tab = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : '" + d.sections[0].id + "'; // phpcs:ignore WordPress.Security.NonceVerification.Recommended\n\nif ( ! isset( $tabs[ $active_tab ] ) ) {\n\t$active_tab = '" + d.sections[0].id + "';\n}\n\n";
  }
  const menuBase = d.isTop ? 'admin.php' : d.parentFile;
  page += '?>\n<div class="wrap">\n\t<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>\n\n';
  if (sp.settingsErrors) page += "\t<?php settings_errors( '" + d.opt + "' ); ?>\n\n";
  if (sp.tabbed) {
    page +=
      '\t<h2 class="nav-tab-wrapper">\n\t\t<?php foreach ( $tabs as $tab_key => $tab_label ) : ?>\n\t\t\t<a\n\t\t\t\thref="<?php echo esc_url( add_query_arg( array( \'page\' => \'' +
      d.slug +
      '\', \'tab\' => $tab_key ), admin_url( \'' +
      menuBase +
      '\' ) ) ); ?>"\n\t\t\t\tclass="nav-tab <?php echo $active_tab === $tab_key ? \'nav-tab-active\' : \'\'; ?>"\n\t\t\t>\n\t\t\t\t<?php echo esc_html( $tab_label ); ?>\n\t\t\t</a>\n\t\t<?php endforeach; ?>\n\t</h2>\n\n';
  }
  page += '\t<form action="options.php" method="post">\n\t\t<?php\n\t\tsettings_fields( \'' + escPhp(d.group) + '\' );\n\t\tdo_settings_sections( ' + (sp.tabbed ? "'" + d.slug + "-' . $active_tab" : "'" + d.slug + "'") + ' );\n\t\tsubmit_button();\n\t\t?>\n\t</form>\n';
  if (sp.resetButton) {
    page +=
      '\n\t<p>\n\t\t<a\n\t\t\thref="<?php echo esc_url( wp_nonce_url( admin_url( \'admin-post.php?action=' +
      pre +
      '_reset_options\' ), \'' +
      pre +
      "_reset_options' ) ); ?>\"\n\t\t\tclass=\"button button-secondary\"\n\t\t>\n\t\t\t<?php esc_html_e( 'Reset to defaults', '" +
      td +
      "' ); ?>\n\t\t</a>\n\t</p>\n";
  }
  page += '</div>\n<?php';
  blocks.push({
    name: 'render_settings_page',
    params: '',
    doc: '/**\n * Render the settings screen.\n */\n',
    body: page,
  });

  if (sp.scopedAssets) {
    blocks.push({
      name: 'admin_assets',
      params: '$hook_suffix',
      hook: 'admin_enqueue_scripts',
      doc: '/**\n * Load assets on this screen only — never on every admin page.\n *\n * @param string $hook_suffix Current admin screen.\n */\n',
      body:
        (isClass ? 'if ( $this->hook !== $hook_suffix ) {' : 'if ( ' + pre + '_settings_hook() !== $hook_suffix ) {') +
        "\n\treturn;\n}\n\nwp_enqueue_style(\n\t'" + d.slug + "-admin',\n\tplugins_url( 'assets/admin.css', __FILE__ ),\n\tarray(),\n\t'1.0.0'\n);",
    });
  }

  if (sp.resetButton) {
    blocks.push({
      name: 'handle_reset',
      params: '',
      hook: 'admin_post_' + pre + '_reset_options',
      doc: '/**\n * Restore the defaults, then bounce back to the settings screen.\n */\n',
      body:
        "if ( ! current_user_can( '" + escPhp(d.cap) + "' ) ) {\n\twp_die( esc_html__( 'You are not allowed to do that.', '" + td + "' ) );\n}\n\ncheck_admin_referer( '" + pre + "_reset_options' );\n\n" +
        (arrayMode
          ? "update_option( '" + d.opt + "', " + call('default_options') + ' );'
          : 'foreach ( ' + call('default_options') + " as $key => $value ) {\n\tupdate_option( '" + pre + "_' . $key, $value );\n}") +
        "\n\nadd_settings_error( '" + d.opt + "', 'reset', __( 'Settings restored to defaults.', '" + td + "' ), 'updated' );\nset_transient( 'settings_errors', get_settings_errors(), 30 );\n\nwp_safe_redirect( add_query_arg( 'settings-updated', 'true', wp_get_referer() ) );\nexit;",
    });
  }

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + (sp.pageTitle || 'Settings Page') + '\n * Description:       Adds the ' + (sp.menuTitle || 'settings') + ' screen and its options.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Text Domain:       ' + td + '\n */\n\ndefined( \'ABSPATH\' ) || exit;\n\n';
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }

  if (isClass) {
    out += 'final class ' + d.cls + ' {\n\n';
    if (sp.scopedAssets) out += "\t/**\n\t * Screen hook suffix for the settings page.\n\t *\n\t * @var string\n\t */\n\tprivate $hook = '';\n\n";
    const hookLines = blocks.filter((b) => b.hook).map((b) => "add_action( '" + b.hook + "', array( $this, '" + b.name + "' ) );");
    out += '\t/**\n\t * Wire the class into WordPress.\n\t */\n\tpublic function hooks() {\n' + indent(hookLines.join('\n'), 2) + '\n\t}\n\n';
    blocks.forEach((b) => {
      out += indent(b.doc, 1) + '\tpublic function ' + b.name + (b.params ? '( ' + b.params + ' )' : '()') + ' {\n' + indent(b.body, 2) + '\n\t}\n\n';
    });
    out += '}\n\n( new ' + d.cls + '() )->hooks();\n';
  } else {
    out += blocks
      .map((b) => {
        let s = b.doc + 'function ' + pre + '_' + b.name + (b.params ? '( ' + b.params + ' )' : '()') + ' {\n' + indent(b.body, 1) + '\n}\n';
        if (b.hook) s += "add_action( '" + b.hook + "', '" + pre + '_' + b.name + "' );\n";
        return s;
      })
      .join('\n');
  }

  if (sp.uninstall) {
    out +=
      '\n/*\n * uninstall.php — sits next to the plugin file and runs when the plugin is deleted.\n *\n * defined( \'WP_UNINSTALL_PLUGIN\' ) || exit;\n' +
      (arrayMode ? " * delete_option( '" + d.opt + "' );\n" : d.fields.map((f) => " * delete_option( '" + optFor(f) + "' );").join('\n') + '\n') +
      ' */\n';
  }
  return withCredit(out);
}

export function freshProject(): SettingsPage {
  return {
    pageTitle: 'Acme Toolkit Settings', menuTitle: 'Acme Toolkit', slug: 'acme-toolkit',
    parent: 'top', customParent: '', capability: 'manage_options', icon: 'dashicons-admin-generic', position: '80',
    prefix: 'acme', textDomain: 'acme-toolkit', optionName: 'acme_toolkit_options', optionGroup: 'acme_toolkit_group',
    storage: 'array', codeStyle: 'procedural',
    sections: [
      { id: 'general', title: 'General', description: 'How the toolkit behaves on the front end.' },
      { id: 'api', title: 'API', description: 'Credentials for the remote service.' },
    ],
    fields: [
      { id: 'enabled', label: 'Enable the toolkit', type: 'checkbox', section: 'general', def: '1', description: 'Turn everything off without deactivating the plugin.', placeholder: '', choices: '' },
      { id: 'mode', label: 'Mode', type: 'select', section: 'general', def: 'fast', description: 'Fast skips the extra validation pass.', placeholder: '', choices: 'fast:Fast, safe:Safe' },
      { id: 'accent', label: 'Accent colour', type: 'color', section: 'general', def: '#2271b1', description: '', placeholder: '#2271b1', choices: '' },
      { id: 'api_key', label: 'API key', type: 'text', section: 'api', def: '', description: 'Found under Account → Developers.', placeholder: 'sk_live_…', choices: '' },
      { id: 'cache_ttl', label: 'Cache lifetime', type: 'number', section: 'api', def: '3600', description: 'Seconds to keep API responses.', placeholder: '3600', choices: '' },
    ],
    tabbed: true, settingsErrors: true, resetButton: false, scopedAssets: true, showInRest: false, uninstall: true, capCheck: true,
  };
}

export function validate(sp: SettingsPage): ValidationIssue[] {
  const d = derive(sp);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, targetId?: string, fix?: string, fixLabel?: string) => out.push({ severity, message, targetId, fix, fixLabel });
  const rawSlug = String(sp.slug || '').trim();
  if (!rawSlug) add('error', 'A menu slug is required — it becomes the ?page= value in the URL.', 'slug');
  else if (rawSlug !== baseSlugify(rawSlug)) add('error', 'Menu slugs must be lowercase letters, numbers and dashes. "' + rawSlug + '" will not match the URL WordPress builds.', 'slug', 'fixSlug', 'Use ' + baseSlugify(rawSlug));
  if (!String(sp.pageTitle || '').trim()) add('warning', 'No page title — the h1 and the browser tab will both be blank.', 'pageTitle');
  if (sp.capability === 'read') add('error', 'A capability of read means any logged-in subscriber can open and save this page.', 'capability', 'setManageOptions', 'Use manage_options');
  else if (sp.capability === 'edit_posts' || sp.capability === 'upload_files') add('recommendation', 'Contributors and authors will see this menu item. Settings that affect the whole site usually want manage_options.', 'capability');
  if (d.isTop && !sp.icon) add('recommendation', 'A top-level menu with no icon renders an empty square in the sidebar.', 'icon', 'addIcon', 'Use the generic gear');
  if (!d.isTop && String(sp.position || '').trim() && sp.parent !== 'custom') add('recommendation', 'Submenu order is set by registration order in most themes — the position field is only read for top-level menus.', 'position');
  if (d.isTop) {
    const p = parseInt(sp.position, 10);
    if (!isNaN(p) && p >= 5 && p <= 25) add('recommendation', 'Position ' + p + ' lands in the middle of the core content menus. Positions 80–100 are the conventional home for plugin settings.', 'position');
  }
  if (d.opt.indexOf(d.pre + '_') !== 0) add('warning', 'The option name is not prefixed with "' + d.pre + '_". Unprefixed option names are the single most common source of plugin conflicts.', 'optionName', 'prefixOption', 'Prefix it');
  if (d.td !== d.slug) add('recommendation', 'The text domain must match the plugin folder name for translations to load — check that "' + d.td + '" is the folder you ship.', 'textDomain');
  if (!d.fields.length) add('warning', 'No fields yet, so the page renders a heading and a Save button that saves nothing.', 'fields');
  const seen: Record<string, boolean> = {};
  d.fields.forEach((f) => {
    if (seen[f.id]) add('error', 'Two fields share the key "' + f.id + '". The second one silently overwrites the first.', 'fields');
    seen[f.id] = true;
    if (!String(f.label || '').trim()) add('warning', 'The field "' + f.id + '" has no label, so its row in the form table will be blank.', 'fields');
    if ((f.type === 'select' || f.type === 'radio') && !f.parsed.length) add('error', 'The ' + f.type + ' field "' + f.id + '" has no choices — it will render an empty control and sanitise to its default.', 'fields', 'addChoices', 'Add two choices');
  });
  const secIds = d.sections.map((s) => s.id);
  (sp.fields || []).forEach((f) => {
    if (f.section && secIds.indexOf(baseSlugify(f.section)) === -1) add('error', 'The field "' + (f.id || 'untitled') + '" points at the missing section "' + f.section + '", so it will never appear.', 'fields', 'reassignSection', 'Move to ' + d.sections[0].title);
  });
  if (sp.tabbed && d.sections.length < 2) add('recommendation', 'Tabs with a single section add chrome without navigation. Turn tabs off until there are two groups.', 'tabbed');
  if (!sp.tabbed && d.sections.length > 3) add('recommendation', d.sections.length + ' sections on one screen is a long scroll — tabs split them into separate pages of the same form.', 'tabbed');
  if (!d.arrayMode && d.fields.length > 3) add('recommendation', 'One option per field means ' + d.fields.length + ' autoloaded rows in wp_options on every page load. A single array option is one row.', 'storage');
  if (sp.showInRest && d.arrayMode) add('recommendation', 'An array option exposed over REST needs a schema. One is generated from your fields — regenerate after adding a field or the API will reject it.', 'showInRest');
  if (!sp.capCheck) add('recommendation', 'The render callback has no current_user_can() check. Core gates the menu, but a direct call to the callback from another plugin would not be gated.', 'capCheck');
  if (!sp.uninstall) add('recommendation', 'Nothing removes the option when the plugin is deleted. An uninstall.php snippet keeps wp_options clean.', 'uninstall');
  if (!sp.settingsErrors && d.isTop) add('warning', 'Top-level pages do not print the "Settings saved." notice automatically — without settings_errors() the save looks like it did nothing.', 'settingsErrors', 'enableNotice', 'Print the notice');
  return out;
}

export function applyFix(sp: SettingsPage, kind: string): SettingsPage {
  const p: SettingsPage = JSON.parse(JSON.stringify(sp));
  const d = derive(p);
  if (kind === 'fixSlug') p.slug = baseSlugify(p.slug);
  if (kind === 'setManageOptions') p.capability = 'manage_options';
  if (kind === 'addIcon') p.icon = 'dashicons-admin-generic';
  if (kind === 'prefixOption') p.optionName = phpName(p.prefix) + '_' + phpName(p.optionName).replace(new RegExp('^' + phpName(p.prefix) + '_?'), '');
  if (kind === 'enableNotice') p.settingsErrors = true;
  if (kind === 'addChoices') {
    p.fields.forEach((f) => {
      if ((f.type === 'select' || f.type === 'radio') && !parseChoices(f.choices).length) f.choices = 'first:First, second:Second';
    });
  }
  if (kind === 'reassignSection') {
    const ids = d.sections.map((s) => s.id);
    p.fields.forEach((f) => {
      if (ids.indexOf(baseSlugify(f.section)) === -1) f.section = ids[0];
    });
  }
  return p;
}
