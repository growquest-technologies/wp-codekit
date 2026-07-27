import { escPhp, slugify as baseSlugify, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'plugin' | 'functions';
export type BaseRoleKey = 'scratch' | 'subscriber' | 'contributor' | 'author' | 'editor';

export interface RoleCapability {
  prefix: string;
  textDomain: string;
  name: string;
  slug: string;
  basedOn: BaseRoleKey;
  version: string;
  caps: string[];
  customCaps: string;
  grantTo: string[];
  migrate: boolean;
  removeOnUninstall: boolean;
  fallbackRole: string;
}

export const CAP_GROUPS: [string, [string, string][]][] = [
  ['Reading and dashboard', [
    ['read', 'See the dashboard at all. Every role needs this.'],
    ['level_0', 'Legacy level, kept for old plugins that still check it.'],
  ]],
  ['Posts', [
    ['edit_posts', 'Write and edit their own posts.'],
    ['edit_others_posts', 'Edit posts written by anyone.'],
    ['publish_posts', 'Publish, rather than submit for review.'],
    ['delete_posts', 'Delete their own posts.'],
    ['delete_others_posts', 'Delete anyone’s posts.'],
    ['edit_published_posts', 'Edit a post after it is live.'],
    ['delete_published_posts', 'Delete a live post.'],
    ['edit_private_posts', 'Edit private posts.'],
    ['read_private_posts', 'See private posts.'],
  ]],
  ['Pages and media', [
    ['edit_pages', 'Edit their own pages.'],
    ['edit_others_pages', 'Edit anyone’s pages.'],
    ['publish_pages', 'Publish pages.'],
    ['delete_pages', 'Delete pages.'],
    ['upload_files', 'Use the media library.'],
    ['unfiltered_html', 'Post arbitrary HTML, including script tags. Treat as dangerous.'],
  ]],
  ['Site management', [
    ['manage_categories', 'Manage taxonomy terms.'],
    ['moderate_comments', 'Approve and edit comments.'],
    ['manage_options', 'Change every site setting. This is effectively admin.'],
    ['edit_theme_options', 'Menus, widgets and the customiser.'],
    ['list_users', 'See the users list.'],
    ['edit_users', 'Edit other users, including their roles.'],
    ['promote_users', 'Change what role someone has.'],
    ['activate_plugins', 'Activate and deactivate plugins.'],
    ['edit_plugins', 'Edit plugin files from the admin. Almost never right.'],
    ['export', 'Export site content.'],
    ['import', 'Import content.'],
  ]],
];

export const BASE_ROLES: Record<BaseRoleKey, { label: string; caps: string[] }> = {
  scratch: { label: 'Nothing — start empty', caps: [] },
  subscriber: { label: 'subscriber', caps: ['read', 'level_0'] },
  contributor: { label: 'contributor', caps: ['read', 'level_0', 'edit_posts', 'delete_posts'] },
  author: { label: 'author', caps: ['read', 'level_0', 'edit_posts', 'delete_posts', 'publish_posts', 'upload_files', 'edit_published_posts', 'delete_published_posts'] },
  editor: {
    label: 'editor',
    caps: [
      'read', 'level_0', 'edit_posts', 'edit_others_posts', 'publish_posts', 'delete_posts', 'delete_others_posts', 'edit_published_posts', 'delete_published_posts',
      'edit_private_posts', 'read_private_posts', 'edit_pages', 'edit_others_pages', 'publish_pages', 'delete_pages', 'upload_files', 'manage_categories', 'moderate_comments', 'unfiltered_html',
    ],
  },
};

export const GRANT_ROLES = ['administrator', 'editor', 'author', 'shop_manager'];
export const DANGEROUS = ['manage_options', 'edit_users', 'promote_users', 'activate_plugins', 'edit_plugins', 'unfiltered_html', 'edit_themes', 'install_plugins'];
export const CORE_ROLE_SLUGS = ['administrator', 'editor', 'author', 'contributor', 'subscriber'];

function fnSlug(s: string): string {
  return baseSlugify(s).replace(/-/g, '_');
}
function slug(s: string): string {
  return baseSlugify(s);
}
function indent(text: string, depth: number): string {
  const pad = '\t'.repeat(depth);
  return text.split('\n').map((l) => (l ? pad + l : '')).join('\n');
}
function pad(s: string, w: number): string {
  return s + ' '.repeat(Math.max(0, w - s.length));
}
export function capList(str: string): string[] {
  return String(str || '')
    .split(',')
    .map((c) => fnSlug(c))
    .filter(Boolean);
}

export interface DerivedRole {
  pre: string;
  td: string;
  slug: string;
  caps: string[];
  custom: string[];
  version: number;
  grants: string[];
}

export function derive(rc: RoleCapability): DerivedRole {
  const pre = fnSlug(rc.prefix) || 'acme';
  const custom = capList(rc.customCaps);
  const caps = (rc.caps || []).concat(custom.filter((c) => (rc.caps || []).indexOf(c) === -1));
  return {
    pre,
    td: slug(rc.textDomain || rc.prefix) || pre.replace(/_/g, '-'),
    slug: fnSlug(rc.slug) || pre + '_role',
    caps,
    custom,
    version: parseInt(rc.version, 10) || 1,
    grants: rc.grantTo || [],
  };
}

export function buildCode(rc: RoleCapability, mode: OutputMode): string {
  const d = derive(rc);
  const pre = d.pre, td = d.td;
  const optName = pre + '_roles_version';
  const capsArray = d.caps.length ? 'array(\n' + indent(d.caps.map((c) => pad("'" + c + "'", 28) + '=> true,').join('\n'), 1) + '\n)' : 'array()';

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + (rc.name || 'Custom role') + '\n * Description:       Adds the ' + d.slug + ' role and its capabilities.\n * Version:           1.0.' + d.version + '\n * Requires PHP:      7.4\n * Text Domain:       ' + td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else {
    out += "<?php\n// Add to your theme's functions.php — though roles usually belong in a plugin.\n\n";
  }

  out += '/**\n * The capability map for this role.\n *\n * @return array\n */\nfunction ' + pre + '_role_caps() {\n\treturn ' + indent(capsArray, 1).replace(/^\t/, '') + ';\n}\n';

  out +=
    "\n/**\n * Create or update the role.\n *\n * add_role() does nothing when the role exists, so changing the map above\n * has no effect on a site that already ran this. Bumping the version does.\n */\nfunction " +
    pre +
    "_install_roles() {\n\t$role = get_role( '" +
    escPhp(d.slug) +
    "' );\n\n\tif ( ! $role ) {\n\t\tadd_role(\n\t\t\t'" +
    escPhp(d.slug) +
    "',\n\t\t\t_x( '" +
    escPhp(rc.name || 'Custom Role') +
    "', 'user role', '" +
    td +
    "' ),\n\t\t\t" +
    pre +
    '_role_caps()\n\t\t);\n\t} else {\n\t\tforeach ( ' +
    pre +
    '_role_caps() as $cap => $grant ) {\n\t\t\t$role->add_cap( $cap, (bool) $grant );\n\t\t}\n\t}\n';
  if (d.grants.length && d.custom.length) {
    out +=
      '\n\t$extra_roles = array( ' +
      d.grants.map((r) => "'" + r + "'").join(', ') +
      ' );\n\n\tforeach ( $extra_roles as $slug ) {\n\t\t$other = get_role( $slug );\n\n\t\tif ( ! $other ) {\n\t\t\tcontinue;\n\t\t}\n\n\t\tforeach ( array( ' +
      d.custom.map((c) => "'" + c + "'").join(', ') +
      ' ) as $cap ) {\n\t\t\t$other->add_cap( $cap );\n\t\t}\n\t}\n';
  }
  out += "\n\tupdate_option( '" + optName + "', " + d.version + ' );\n}\n';

  if (rc.migrate) {
    out +=
      '\n/**\n * Re-apply the map whenever the version changes.\n */\nfunction ' +
      pre +
      "_maybe_install_roles() {\n\tif ( (int) get_option( '" +
      optName +
      "', 0 ) === " +
      d.version +
      ' ) {\n\t\treturn;\n\t}\n\n\t' +
      pre +
      "_install_roles();\n}\nadd_action( 'admin_init', '" +
      pre +
      "_maybe_install_roles' );\n";
  }
  if (mode === 'plugin') {
    out += "\nregister_activation_hook( __FILE__, '" + pre + "_install_roles' );\n";
  }

  if (rc.removeOnUninstall) {
    out +=
      "\n/**\n * Remove the role, moving anyone who had it somewhere safe first.\n *\n * remove_role() on its own leaves those users with no role at all.\n */\nfunction " +
      pre +
      "_remove_roles() {\n\t$users = get_users( array( 'role' => '" +
      escPhp(d.slug) +
      "', 'fields' => 'ID' ) );\n\n\tforeach ( $users as $user_id ) {\n\t\t$user = new WP_User( $user_id );\n\t\t$user->remove_role( '" +
      escPhp(d.slug) +
      "' );\n\n\t\tif ( ! $user->roles ) {\n\t\t\t$user->add_role( '" +
      escPhp(rc.fallbackRole || 'subscriber') +
      "' );\n\t\t}\n\t}\n\n\tremove_role( '" +
      escPhp(d.slug) +
      "' );\n";
    if (d.grants.length && d.custom.length) {
      out +=
        '\n\tforeach ( array( ' +
        d.grants.map((r) => "'" + r + "'").join(', ') +
        ' ) as $slug ) {\n\t\t$other = get_role( $slug );\n\n\t\tif ( ! $other ) {\n\t\t\tcontinue;\n\t\t}\n\n\t\tforeach ( array( ' +
        d.custom.map((c) => "'" + c + "'").join(', ') +
        ' ) as $cap ) {\n\t\t\t$other->remove_cap( $cap );\n\t\t}\n\t}\n';
    }
    out += "\n\tdelete_option( '" + optName + "' );\n}\n";
    if (mode === 'plugin') out += '\n// Call ' + pre + "_remove_roles() from uninstall.php — not on deactivation,\n// or a plugin update would strip everyone's access.\n";
  }
  return withCredit(out);
}

export function freshProject(): RoleCapability {
  return {
    prefix: 'acme', textDomain: 'acme', name: 'Shop Editor', slug: 'shop_editor',
    basedOn: 'author', version: '1',
    caps: BASE_ROLES.author.caps.slice(),
    customCaps: 'edit_briefs, publish_briefs',
    grantTo: ['administrator'],
    migrate: true, removeOnUninstall: true, fallbackRole: 'subscriber',
  };
}

export function validate(rc: RoleCapability): ValidationIssue[] {
  const d = derive(rc);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, targetId?: string, fix?: string, fixLabel?: string) => out.push({ severity, message, targetId, fix, fixLabel });
  const has = (c: string) => d.caps.indexOf(c) >= 0;

  if (!String(rc.name || '').trim()) add('error', 'A display name is required — it is what the Users screen shows.', 'name');
  if (!String(rc.slug || '').trim()) add('error', 'A role slug is required. It is the key stored against every user who has this role.', 'slug');
  else if (String(rc.slug).trim() !== d.slug) add('error', '"' + rc.slug + '" is not a safe role slug. Lowercase and underscores — it is a database key.', 'slug', 'fixSlug', 'Use ' + d.slug);
  if (CORE_ROLE_SLUGS.indexOf(d.slug) >= 0) add('error', '"' + d.slug + '" is a core role. This code would rewrite the capabilities of every existing ' + d.slug + ' on the site.', 'slug');
  if (!d.caps.length) add('error', 'No capabilities at all. A user in this role cannot even load the dashboard.', 'caps', 'addRead', 'Grant read');
  else if (!has('read')) add('error', 'Without the read capability, users in this role are bounced out of wp-admin entirely.', 'caps', 'addRead', 'Grant read');
  if (has('manage_options')) add('warning', 'manage_options is administrator-level: settings, permalinks, plugin options, everything. If this role is not meant to be an admin, drop it.', 'caps', 'dropManage', 'Remove it');
  if (has('edit_users') || has('promote_users')) add('warning', 'This role can change other users’ roles, which means it can promote itself to administrator.', 'caps', 'dropUserAdmin', 'Remove user admin');
  if (has('edit_plugins')) add('error', 'edit_plugins allows editing PHP from the admin — that is arbitrary code execution. Nobody but a developer should have it, and even then not through a role.', 'caps', 'dropPluginEdit', 'Remove it');
  if (has('unfiltered_html')) add('warning', 'unfiltered_html lets this role post script tags. Reasonable for a trusted editor, dangerous for a client-facing role.', 'caps');
  if (has('edit_others_posts') && !has('edit_posts')) add('error', 'edit_others_posts without edit_posts leaves the editor screens half-broken — core checks edit_posts first.', 'caps', 'addEditPosts', 'Grant edit_posts');
  if (has('publish_posts') && !has('edit_posts')) add('error', 'publish_posts without edit_posts gives nothing to publish.', 'caps', 'addEditPosts', 'Grant edit_posts');
  if (has('edit_published_posts') && !has('publish_posts')) add('recommendation', 'edit_published_posts without publish_posts is a valid review workflow — the role can revise live posts but not publish new ones. Worth confirming that is the intent.', 'caps');
  if (has('upload_files') === false && (has('edit_posts') || has('edit_pages'))) add('warning', 'This role can write posts but cannot upload an image. Almost always an oversight.', 'caps', 'addUpload', 'Grant upload_files');
  if (has('delete_others_posts') && !has('edit_others_posts')) add('recommendation', 'Deleting others’ posts without being able to edit them is an odd combination.', 'caps');
  if (has('edit_pages') && !has('edit_posts')) add('recommendation', 'Pages only, no posts — fine for a brochure site role, unusual otherwise.', 'caps');
  d.custom.forEach((c) => {
    if (/^(edit|delete|read)_(post|page)$/.test(c)) add('error', '"' + c + '" is a meta capability that core maps per object. Storing it in a role does nothing — check it with current_user_can( \'' + c + '\', $post_id ) instead.', 'customCaps');
  });
  if (d.custom.length && !d.grants.length) add('warning', 'You added custom capabilities but granted them to no existing role, so not even an administrator can use the post type they belong to.', 'grantTo', 'grantAdmin', 'Grant to administrator');
  if (d.grants.indexOf('administrator') === -1 && d.custom.length) add('recommendation', 'Administrators do not automatically get custom capabilities. If they should manage this content, they need them explicitly.', 'grantTo');
  if (!rc.migrate) add('warning', 'No migration routine. add_role() silently does nothing when the role exists, so every future change to this map will fail to apply on sites that already ran it.', 'migrate', 'addMigrate', 'Add the migration');
  if (!parseInt(rc.version, 10)) add('error', 'The version must be a number — it is what the migration compares against.', 'version');
  if (!rc.removeOnUninstall) add('recommendation', 'Nothing removes the role on uninstall. Orphaned roles accumulate on client sites and confuse the next developer.', 'removeOnUninstall');
  if (rc.removeOnUninstall && !String(rc.fallbackRole || '').trim()) add('error', 'Choose a fallback role, or removal leaves those users with no role and no access.', 'fallbackRole');
  if (d.caps.length > 25) add('recommendation', d.caps.length + ' capabilities is close to editor territory. Consider whether cloning editor and removing a few is simpler to reason about.', 'caps');
  return out;
}

export function applyFix(rc: RoleCapability, kind: string): RoleCapability {
  const p: RoleCapability = JSON.parse(JSON.stringify(rc));
  p.caps = p.caps || [];
  const addCap = (c: string) => {
    if (p.caps.indexOf(c) === -1) p.caps.push(c);
  };
  const dropCap = (c: string) => {
    const i = p.caps.indexOf(c);
    if (i >= 0) p.caps.splice(i, 1);
  };
  if (kind === 'fixSlug') p.slug = fnSlug(p.slug);
  if (kind === 'addRead') addCap('read');
  if (kind === 'dropManage') dropCap('manage_options');
  if (kind === 'dropUserAdmin') {
    dropCap('edit_users');
    dropCap('promote_users');
  }
  if (kind === 'dropPluginEdit') dropCap('edit_plugins');
  if (kind === 'addEditPosts') addCap('edit_posts');
  if (kind === 'addUpload') addCap('upload_files');
  if (kind === 'grantAdmin') {
    p.grantTo = p.grantTo || [];
    if (p.grantTo.indexOf('administrator') === -1) p.grantTo.push('administrator');
  }
  if (kind === 'addMigrate') p.migrate = true;
  return p;
}
