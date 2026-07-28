import { lazy, type ComponentType } from 'react';

/**
 * Maps a tool id (from src/data/tools.ts) to its page component, code-split via
 * React.lazy. Add one line here per generator — nothing else needs to change
 * (GeneratorRoute and the router don't know about individual tools).
 */
export const GENERATOR_REGISTRY: Record<string, () => Promise<{ default: ComponentType }>> = {
  readme: () => import('../pages/generators/ReadmeStudio').then((m) => ({ default: m.ReadmeStudio })),
  'post-type': () => import('../pages/generators/PostTypeGenerator').then((m) => ({ default: m.PostTypeGenerator })),
  taxonomy: () => import('../pages/generators/TaxonomyGenerator').then((m) => ({ default: m.TaxonomyGenerator })),
  shortcode: () => import('../pages/generators/ShortcodeGenerator').then((m) => ({ default: m.ShortcodeGenerator })),
  'meta-box': () => import('../pages/generators/MetaBoxGenerator').then((m) => ({ default: m.MetaBoxGenerator })),
  'post-meta': () => import('../pages/generators/PostMetaGenerator').then((m) => ({ default: m.PostMetaGenerator })),
  'term-meta': () => import('../pages/generators/TermMetaGenerator').then((m) => ({ default: m.TermMetaGenerator })),
  'post-status': () => import('../pages/generators/PostStatusGenerator').then((m) => ({ default: m.PostStatusGenerator })),
  'block-pattern': () => import('../pages/generators/BlockPatternGenerator').then((m) => ({ default: m.BlockPatternGenerator })),
  'settings-page': () => import('../pages/generators/SettingsPageGenerator').then((m) => ({ default: m.SettingsPageGenerator })),
  'dashboard-widget': () => import('../pages/generators/DashboardWidgetGenerator').then((m) => ({ default: m.DashboardWidgetGenerator })),
  'admin-notice': () => import('../pages/generators/AdminNoticeGenerator').then((m) => ({ default: m.AdminNoticeGenerator })),
  toolbar: () => import('../pages/generators/ToolbarNodeGenerator').then((m) => ({ default: m.ToolbarNodeGenerator })),
  'list-table': () => import('../pages/generators/ListTableGenerator').then((m) => ({ default: m.ListTableGenerator })),
  quicktags: () => import('../pages/generators/QuicktagsGenerator').then((m) => ({ default: m.QuicktagsGenerator })),
  'user-contact': () => import('../pages/generators/UserContactMethodsGenerator').then((m) => ({ default: m.UserContactMethodsGenerator })),
  'user-role': () => import('../pages/generators/RoleCapabilityGenerator').then((m) => ({ default: m.RoleCapabilityGenerator })),
  'wp-query': () => import('../pages/generators/WPQueryBuilder').then((m) => ({ default: m.WPQueryBuilder })),
  'tax-query': () => import('../pages/generators/TaxQueryBuilder').then((m) => ({ default: m.TaxQueryBuilder })),
  'meta-query': () => import('../pages/generators/MetaQueryBuilder').then((m) => ({ default: m.MetaQueryBuilder })),
  'date-query': () => import('../pages/generators/DateQueryBuilder').then((m) => ({ default: m.DateQueryBuilder })),
  'user-query': () => import('../pages/generators/UserQueryBuilder').then((m) => ({ default: m.UserQueryBuilder })),
  'term-query': () => import('../pages/generators/TermQueryBuilder').then((m) => ({ default: m.TermQueryBuilder })),
  'comment-query': () => import('../pages/generators/CommentQueryBuilder').then((m) => ({ default: m.CommentQueryBuilder })),
  sidebar: () => import('../pages/generators/SidebarGenerator').then((m) => ({ default: m.SidebarGenerator })),
  'nav-menu': () => import('../pages/generators/NavMenuGenerator').then((m) => ({ default: m.NavMenuGenerator })),
  'theme-support': () => import('../pages/generators/ThemeSupportGenerator').then((m) => ({ default: m.ThemeSupportGenerator })),
  widget: () => import('../pages/generators/WidgetClassGenerator').then((m) => ({ default: m.WidgetClassGenerator })),
  'theme-json': () => import('../pages/generators/ThemeJsonGenerator').then((m) => ({ default: m.ThemeJsonGenerator })),
  'default-headers': () => import('../pages/generators/DefaultThemeHeadersGenerator').then((m) => ({ default: m.DefaultThemeHeadersGenerator })),
  'child-theme': () => import('../pages/generators/ChildThemeGenerator').then((m) => ({ default: m.ChildThemeGenerator })),
  hooks: () => import('../pages/generators/HooksGenerator').then((m) => ({ default: m.HooksGenerator })),
  'wp-config': () => import('../pages/generators/WpConfigGenerator').then((m) => ({ default: m.WpConfigGenerator })),
  enqueue: () => import('../pages/generators/EnqueueGenerator').then((m) => ({ default: m.EnqueueGenerator })),
  cron: () => import('../pages/generators/CronEventGenerator').then((m) => ({ default: m.CronEventGenerator })),
  'rest-route': () => import('../pages/generators/RestRouteGenerator').then((m) => ({ default: m.RestRouteGenerator })),
  activation: () => import('../pages/generators/ActivationHooksGenerator').then((m) => ({ default: m.ActivationHooksGenerator })),
  'plugin-header': () => import('../pages/generators/PluginHeaderGenerator').then((m) => ({ default: m.PluginHeaderGenerator })),
  oembed: () => import('../pages/generators/OembedProviderGenerator').then((m) => ({ default: m.OembedProviderGenerator })),
  'wc-order-query': () => import('../pages/generators/WcOrderQueryGenerator').then((m) => ({ default: m.WcOrderQueryGenerator })),
  'wc-product-fields': () => import('../pages/generators/WcProductFieldsGenerator').then((m) => ({ default: m.WcProductFieldsGenerator })),
  'wc-order-status': () => import('../pages/generators/WcOrderStatusGenerator').then((m) => ({ default: m.WcOrderStatusGenerator })),
  'wc-product-tabs': () => import('../pages/generators/WcProductTabsGenerator').then((m) => ({ default: m.WcProductTabsGenerator })),
  'wc-cart-fee': () => import('../pages/generators/WcCartFeeGenerator').then((m) => ({ default: m.WcCartFeeGenerator })),
  'wc-shipping-method': () => import('../pages/generators/WcShippingMethodGenerator').then((m) => ({ default: m.WcShippingMethodGenerator })),
  'wc-payment-gateway': () => import('../pages/generators/WcPaymentGatewayGenerator').then((m) => ({ default: m.WcPaymentGatewayGenerator })),
  'wc-account-endpoint': () => import('../pages/generators/WcAccountEndpointGenerator').then((m) => ({ default: m.WcAccountEndpointGenerator })),
  'wc-checkout-fields': () => import('../pages/generators/WcCheckoutFieldsGenerator').then((m) => ({ default: m.WcCheckoutFieldsGenerator })),
  'wc-email': () => import('../pages/generators/WcEmailGenerator').then((m) => ({ default: m.WcEmailGenerator })),
};

export function getGeneratorComponent(id: string) {
  const loader = GENERATOR_REGISTRY[id];
  if (!loader) return null;
  return lazy(loader);
}
