import { alignBlock, escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type FieldType = 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'url';
export type BodyKind = 'posts' | 'text' | 'list' | 'blank';

export const TYPES: [FieldType, string][] = [
  ['text', 'Text'], ['textarea', 'Textarea'], ['number', 'Number'], ['checkbox', 'Checkbox'], ['select', 'Select'], ['url', 'URL'],
];
export const BODIES: [BodyKind, string][] = [
  ['posts', 'Recent posts'], ['text', 'Rich text'], ['list', 'Custom list'], ['blank', 'Empty stub'],
];

const SANITIZE: Record<FieldType, string | null> = { text: 'sanitize_text_field', textarea: 'sanitize_textarea_field', number: 'absint', checkbox: null, select: 'sanitize_key', url: 'esc_url_raw' };

export interface WidgetField {
  id: string;
  label: string;
  type: FieldType;
  def: string;
  choices: string;
}

export interface WidgetClass {
  name: string;
  idBase: string;
  className: string;
  textDomain: string;
  description: string;
  body: BodyKind;
  fields: WidgetField[];
  shortcode: boolean;
}

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
/** Dash-based slug used only for the text domain, matching the original source's slugify(). */
function dashSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
export function pascal(s: string): string {
  return String(s || '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('_');
}
function indent(text: string, depth: number): string {
  const pad = '\t'.repeat(depth);
  return text.split('\n').map((l) => (l ? pad + l : '')).join('\n');
}

export interface Choice {
  value: string;
  label: string;
}

export function parseChoices(str: string): Choice[] {
  return String(str || '').split(',').map((part) => {
    const p = part.trim();
    if (!p) return null;
    const i = p.indexOf(':');
    const v = dashSlug(i >= 0 ? p.slice(0, i) : p);
    const l = i >= 0 ? p.slice(i + 1).trim() : p.charAt(0).toUpperCase() + p.slice(1);
    return v ? { value: v, label: l || v } : null;
  }).filter((c): c is Choice => c !== null);
}

export interface DerivedField extends WidgetField {
  parsed: Choice[];
}

export interface Derived {
  idBase: string;
  cls: string;
  td: string;
  fields: DerivedField[];
}

export function derive(wg: WidgetClass): Derived {
  return {
    idBase: fnSlug(wg.idBase) || 'acme_widget',
    cls: pascal(wg.className) || 'Acme_Widget',
    td: dashSlug(wg.textDomain) || 'acme',
    fields: (wg.fields || []).map((f) => ({ ...f, id: fnSlug(f.id) || 'field', parsed: parseChoices(f.choices) })),
  };
}

function defLiteral(f: WidgetField): string {
  const v = String(f.def == null ? '' : f.def).trim();
  if (f.type === 'checkbox') return v === '1' || v === 'true' ? 'true' : 'false';
  if (f.type === 'number') return String(parseInt(v, 10) || 0);
  return "'" + escPhp(v) + "'";
}

export function buildCode(wg: WidgetClass, mode: OutputMode): string {
  const d = derive(wg);
  const t = (s: string) => "__( '" + escPhp(s) + "', '" + d.td + "' )";
  const titleField = d.fields.find((f) => f.id === 'title');

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + (wg.name || 'Widget') + '\n * Description:       Adds the ' + (wg.name || 'widget') + ' widget.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Text Domain:       ' + d.td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php, or better, its own include.\n\n";
  }

  out += '/**\n * ' + (wg.name || 'Widget') + '.\n */\nclass ' + d.cls + ' extends WP_Widget {\n\n';
  out += '\t/**\n\t * Register the widget with its id base and picker labels.\n\t */\n\tpublic function __construct() {\n\t\tparent::__construct(\n\t\t\t\'' + d.idBase + "',\n\t\t\t" + t(wg.name || 'Widget') + ',\n\t\t\tarray(\n\t\t\t\t\'description\' => ' + t(wg.description || '') + ",\n\t\t\t\t'classname'   => '" + d.idBase.replace(/_/g, '-') + "',\n\t\t\t)\n\t\t);\n\t}\n\n";

  out += '\t/**\n\t * Default values for every field.\n\t *\n\t * @return array\n\t */\n\tprotected function defaults() {\n\t\treturn ' + (d.fields.length ? 'array(\n' + indent(alignBlock(d.fields.map((f) => [f.id, defLiteral(f)] as [string, string]), ''), 3) + '\n\t\t)' : 'array()') + ';\n\t}\n\n';

  let widgetBody = "$instance = wp_parse_args( (array) $instance, $this->defaults() );\n\necho $args['before_widget'];\n\n";
  if (titleField) {
    widgetBody += "if ( ! empty( $instance['title'] ) ) {\n\techo $args['before_title'] . esc_html( apply_filters( 'widget_title', $instance['title'], $instance, $this->id_base ) ) . $args['after_title'];\n}\n\n";
  }
  if (wg.body === 'posts') {
    const countField = d.fields.find((f) => f.type === 'number');
    widgetBody += '$posts = get_posts(\n\tarray(\n\t\t\'post_type\'      => \'post\',\n\t\t\'posts_per_page\' => ' + (countField ? "(int) $instance['" + countField.id + "']" : '5') + ",\n\t\t'post_status'    => 'publish',\n\t\t'no_found_rows'  => true,\n\t)\n);\n\nif ( $posts ) {\n\techo '<ul>';\n\n\tforeach ( $posts as $post ) {\n\t\tprintf(\n\t\t\t'<li><a href=\"%1$s\">%2$s</a></li>',\n\t\t\tesc_url( get_permalink( $post ) ),\n\t\t\tesc_html( get_the_title( $post ) )\n\t\t);\n\t}\n\n\techo '</ul>';\n}\n\n";
  } else if (wg.body === 'text') {
    const textField = d.fields.find((f) => f.type === 'textarea');
    widgetBody += textField
      ? "if ( ! empty( $instance['" + textField.id + "'] ) ) {\n\tprintf(\n\t\t'<div class=\"textwidget\">%s</div>',\n\t\twpautop( wp_kses_post( $instance['" + textField.id + "'] ) )\n\t);\n}\n\n"
      : "echo '<p>' . esc_html__( 'Add a textarea field to render copy here.', '" + d.td + "' ) . '</p>';\n\n";
  } else if (wg.body === 'list') {
    widgetBody += "echo '<ul class=\"" + d.idBase.replace(/_/g, '-') + "-list\">';\n\nforeach ( $this->get_items( $instance ) as $item ) {\n\tprintf(\n\t\t'<li><a href=\"%1$s\">%2$s</a></li>',\n\t\tesc_url( $item['url'] ),\n\t\tesc_html( $item['label'] )\n\t);\n}\n\necho '</ul>';\n\n";
  } else {
    widgetBody += '// Your output here. Everything you echo must be escaped.\n\n';
  }
  widgetBody += "echo $args['after_widget'];";
  out += '\t/**\n\t * Front-end output.\n\t *\n\t * @param array $args     Sidebar arguments.\n\t * @param array $instance Saved settings.\n\t */\n\tpublic function widget( $args, $instance ) {\n' + indent(widgetBody, 2) + '\n\t}\n\n';

  if (wg.body === 'list') {
    out += '\t/**\n\t * The items to list. Replace with your own source.\n\t *\n\t * @param array $instance Saved settings.\n\t * @return array\n\t */\n\tprotected function get_items( $instance ) {\n\t\treturn array();\n\t}\n\n';
  }

  let formBody = '$instance = wp_parse_args( (array) $instance, $this->defaults() );\n\n';
  formBody += d.fields.map((f) => {
    const idCall = "$this->get_field_id( '" + f.id + "' )";
    const nameCall = "$this->get_field_name( '" + f.id + "' )";
    const val = "$instance['" + f.id + "']";
    if (f.type === 'checkbox') {
      return 'printf(\n\t\'<p><input class="checkbox" type="checkbox" id="%1$s" name="%2$s" value="1"%3$s /> <label for="%1$s">%4$s</label></p>\',\n\tesc_attr( ' + idCall + ' ),\n\tesc_attr( ' + nameCall + ' ),\n\tchecked( (bool) ' + val + ', true, false ),\n\tesc_html( ' + t(f.label || f.id) + ' )\n);';
    }
    if (f.type === 'textarea') {
      return 'printf(\n\t\'<p><label for="%1$s">%3$s</label><textarea class="widefat" rows="5" id="%1$s" name="%2$s">%4$s</textarea></p>\',\n\tesc_attr( ' + idCall + ' ),\n\tesc_attr( ' + nameCall + ' ),\n\tesc_html( ' + t(f.label || f.id) + ' ),\n\tesc_textarea( ' + val + ' )\n);';
    }
    if (f.type === 'select') {
      return "printf(\n\t'<p><label for=\"%1$s\">%3$s</label>',\n\tesc_attr( " + idCall + ' ),\n\tesc_attr( ' + nameCall + ' ),\n\tesc_html( ' + t(f.label || f.id) + " )\n);\nprintf( '<select class=\"widefat\" id=\"%1$s\" name=\"%2$s\">', esc_attr( " + idCall + ' ), esc_attr( ' + nameCall + ' ) );\n\nforeach ( array(\n' + indent(alignBlock(f.parsed.map((c) => [c.value, t(c.label)] as [string, string]), ''), 1) + '\n) as $value => $label ) {\n\tprintf(\n\t\t\'<option value="%1$s"%2$s>%3$s</option>\',\n\t\tesc_attr( $value ),\n\t\tselected( ' + val + ", $value, false ),\n\t\tesc_html( $label )\n\t);\n}\n\necho '</select></p>';";
    }
    const inputType = f.type === 'number' ? 'number' : f.type === 'url' ? 'url' : 'text';
    return 'printf(\n\t\'<p><label for="%1$s">%3$s</label><input class="widefat" type="' + inputType + '" id="%1$s" name="%2$s" value="%4$s" /></p>\',\n\tesc_attr( ' + idCall + ' ),\n\tesc_attr( ' + nameCall + ' ),\n\tesc_html( ' + t(f.label || f.id) + ' ),\n\tesc_attr( ' + val + ' )\n);';
  }).join('\n\n');
  if (!d.fields.length) formBody += '// No settings — nothing to render here.';
  out += '\t/**\n\t * The settings form in the admin.\n\t *\n\t * @param array $instance Saved settings.\n\t */\n\tpublic function form( $instance ) {\n' + indent(formBody, 2) + '\n\t}\n\n';

  let updateBody = '$instance = $old_instance;\n\n';
  updateBody += d.fields.map((f) => {
    const key = "$instance['" + f.id + "']";
    const post = "$new_instance['" + f.id + "']";
    if (f.type === 'checkbox') return key + ' = ! empty( ' + post + ' );';
    if (f.type === 'select' && f.parsed.length) {
      return key + ' = isset( ' + post + ' ) && in_array( sanitize_key( ' + post + ' ), array( ' + f.parsed.map((c) => "'" + c.value + "'").join(', ') + ' ), true )\n\t? sanitize_key( ' + post + ' )\n\t: ' + defLiteral(f) + ';';
    }
    if (f.type === 'textarea') return key + ' = isset( ' + post + ' ) ? wp_kses_post( ' + post + ' ) : ' + defLiteral(f) + ';';
    return key + ' = isset( ' + post + ' ) ? ' + SANITIZE[f.type] + '( ' + post + ' ) : ' + defLiteral(f) + ';';
  }).join('\n');
  updateBody += '\n\nreturn $instance;';
  out += '\t/**\n\t * Sanitise settings on save.\n\t *\n\t * @param array $new_instance Submitted values.\n\t * @param array $old_instance Previously saved values.\n\t * @return array\n\t */\n\tpublic function update( $new_instance, $old_instance ) {\n' + indent(updateBody, 2) + '\n\t}\n';
  out += '}\n';

  out += '\n/**\n * Register the widget.\n */\nfunction ' + fnSlug(d.idBase) + '_register() {\n\tregister_widget( \'' + d.cls + "' );\n}\nadd_action( 'widgets_init', '" + fnSlug(d.idBase) + "_register' );\n";

  if (wg.shortcode) {
    out += '\n/**\n * The same output as a shortcode, for pages that are not sidebars.\n *\n * @param array $atts Shortcode attributes.\n * @return string\n */\nfunction ' + fnSlug(d.idBase) + '_shortcode( $atts ) {\n\t$widget = new ' + d.cls + '();\n\n\tob_start();\n\t$widget->widget(\n\t\tarray(\n\t\t\t\'before_widget\' => \'<div class="' + d.idBase.replace(/_/g, '-') + '">\',\n\t\t\t\'after_widget\'  => \'</div>\',\n\t\t\t\'before_title\'  => \'<h2>\',\n\t\t\t\'after_title\'   => \'</h2>\',\n\t\t),\n\t\t(array) $atts\n\t);\n\n\treturn ob_get_clean();\n}\n' + "add_shortcode( '" + d.idBase.replace(/_/g, '-') + "', '" + fnSlug(d.idBase) + "_shortcode' );\n";
  }
  return withCredit(out);
}

export function validate(wg: WidgetClass): ValidationIssue[] {
  const d = derive(wg);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  if (!String(wg.name || '').trim()) add('error', 'A name is required — it is the label in the widget picker.');
  if (!String(wg.idBase || '').trim()) add('error', 'An id_base is required. It keys every saved instance in wp_options, so changing it later orphans existing widgets.');
  else if (fnSlug(wg.idBase) !== String(wg.idBase).trim()) add('warning', '“' + wg.idBase + '” is not a safe id_base. Lowercase with underscores.', 'fixId', 'Use ' + fnSlug(wg.idBase));
  if (!String(wg.className || '').trim()) add('error', 'A class name is required.');
  else if (pascal(wg.className) !== String(wg.className).trim()) add('recommendation', 'WordPress class names are conventionally Capitalised_With_Underscores — “' + pascal(wg.className) + '”.', 'fixClass', 'Use ' + pascal(wg.className));
  if (!String(wg.description || '').trim()) add('warning', 'No description, so the widget picker shows the name with nothing under it.');
  if (!d.fields.length) add('warning', 'No settings fields. A widget with no options is usually better as a template part or a block.');
  const seen: Record<string, boolean> = {};
  d.fields.forEach((f) => {
    if (seen[f.id]) add('error', 'Two fields share the id “' + f.id + '”. The second overwrites the first in every saved instance.');
    seen[f.id] = true;
    if (!String(f.label || '').trim()) add('warning', 'The field “' + f.id + '” has no label.');
    if (f.type === 'select' && !f.parsed.length) add('error', 'The select “' + f.id + '” has no choices, so it renders empty and always falls back to its default.', 'addChoices', 'Add two choices');
    if (f.type === 'textarea') add('recommendation', '“' + f.id + '” is saved with wp_kses_post(), which keeps safe HTML. If it should be plain text, switch the type.');
  });
  if (!d.fields.some((f) => f.id === 'title')) add('warning', 'No field with the id “title”, so the widget never prints before_title and the theme’s heading styles do not apply.', 'addTitle', 'Add a title field');
  if (wg.body === 'posts' && !d.fields.some((f) => f.type === 'number')) add('warning', 'The recent-posts body needs a number field to control how many to show — five is hard-coded without one.', 'addCount', 'Add a count field');
  if (wg.body === 'text' && !d.fields.some((f) => f.type === 'textarea')) add('warning', 'The rich-text body has no textarea field to render.', 'addTextarea', 'Add a textarea');
  if (wg.body === 'blank') add('recommendation', 'The widget() body is a stub. Whatever you echo there must be escaped — esc_html() for text, wp_kses_post() for markup.');
  if (wg.shortcode) add('recommendation', 'The shortcode wrapper instantiates the widget directly, so its saved settings are not used — attributes stand in for them.');
  add('recommendation', 'Since 5.8 this renders inside a Legacy Widget block. It works, but in a block theme a real block is the better long-term home.');
  return out;
}

export function freshProject(): WidgetClass {
  return {
    name: 'Recent Case Studies', idBase: 'acme_case_studies', className: 'Acme_Case_Studies_Widget', textDomain: 'acme',
    description: 'Lists the newest case studies with links.',
    body: 'posts',
    fields: [
      { id: 'title', label: 'Title', type: 'text', def: 'Recent work', choices: '' },
      { id: 'count', label: 'How many to show', type: 'number', def: '5', choices: '' },
      { id: 'order', label: 'Order', type: 'select', def: 'date', choices: 'date:Newest first, title:A to Z' },
      { id: 'show_date', label: 'Show the date', type: 'checkbox', def: '0', choices: '' },
    ],
    shortcode: false,
  };
}

export function applyFix(wg: WidgetClass, kind: string): WidgetClass {
  const p: WidgetClass = JSON.parse(JSON.stringify(wg));
  if (kind === 'fixId') p.idBase = fnSlug(p.idBase);
  if (kind === 'fixClass') p.className = pascal(p.className);
  if (kind === 'addTitle') { p.fields = p.fields || []; p.fields.unshift({ id: 'title', label: 'Title', type: 'text', def: '', choices: '' }); }
  if (kind === 'addCount') { p.fields = p.fields || []; p.fields.push({ id: 'count', label: 'How many to show', type: 'number', def: '5', choices: '' }); }
  if (kind === 'addTextarea') { p.fields = p.fields || []; p.fields.push({ id: 'body', label: 'Text', type: 'textarea', def: '', choices: '' }); }
  if (kind === 'addChoices') p.fields.forEach((f) => { if (f.type === 'select' && !parseChoices(f.choices).length) f.choices = 'first:First, second:Second'; });
  return p;
}
