=== Virtual Bundles for WooCommerce ===
Contributors: (add your wordpress.org username here)
Donate link: https://smartwpplugins.com/
Tags: woocommerce, bundles, product bundles, cart, upsell
Requires at least: 6.9
Tested up to: 6.9
Requires PHP: 8.0
WC requires at least: 10.7.0
WC tested up to: 10.9
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Create admin-configured WooCommerce product bundles — real products, variations, and custom virtual line items — added to cart with one shareable link.

== Description ==

Virtual Bundles for WooCommerce lets you build product bundles from the admin and share a single link that adds every item to a customer's cart in one step — no shortcode, no separate bundle product page to maintain.

A bundle can mix:

* **Real WooCommerce products and variations**, priced at their live catalog price or discounted per bundle.
* **Custom virtual line items** — a name and price you define directly, with no product of their own.

Each bundle gets a simple URL (`yoursite.com/?bundle=bundle-slug` by default, and the query parameter itself is configurable from Settings) that, when visited, adds every bundle item to the cart at the bundle's configured pricing, locked together as a single purchasable unit.

= Key features =

* **Three pricing modes per item** — percentage off, fixed amount off, or a flat custom price — independent of the item's regular WooCommerce price.
* **Custom virtual items** with their own name, price, and optional shipping (weight/dimensions/shipping class), carried by a shared, hidden carrier product.
* **Redemption limits** — cap how many times a bundle can be purchased in total, or per customer, enforced both at add-to-cart time and again at checkout.
* **Cart integrity controls** — bundle items are quantity-locked and cascade out of the cart together by default, with per-item and per-bundle overrides available (allow quantity changes on specific items, allow individual item removal).
* **Configurable post-add redirect** — send customers to the cart, straight to checkout, or a custom URL, either globally or per bundle.
* **Per-item coupon eligibility** — decide which bundle items, if any, can still be discounted by a WooCommerce coupon.
* **Full WooCommerce Cart & Checkout Blocks support**, alongside classic cart/checkout, and High-Performance Order Storage (HPOS) compatibility.
* **A developer-friendly hooks & filters API** — see `HOOKS.md` in the plugin folder for the complete list of actions and filters this plugin exposes, including a dedicated integration point for loyalty/analytics/webhook plugins right after a bundle is added to cart.

= How it works =

1. Create a bundle from Products → Virtual Bundles → Add New Bundle.
2. Add real products/variations and/or custom items, set quantities and per-item pricing.
3. Copy the bundle's link from the list screen or the edit screen's sidebar.
4. Share that link anywhere — an email, an ad, a landing page. Visiting it adds the whole bundle to the customer's cart.

== Installation ==

1. Upload the plugin files to `/wp-content/plugins/virtual-bundles-for-woocommerce`, or install the plugin directly through the WordPress plugins screen.
2. Activate the plugin through the "Plugins" screen in WordPress.
3. Make sure WooCommerce is installed and active.
4. Go to Products → Virtual Bundles to create your first bundle.
5. Optional: visit WooCommerce → Settings → Products → Virtual Bundles to configure the carrier product, cart behavior, redirect behavior, and the bundle URL parameter.

== Frequently Asked Questions ==

= Does this replace my products with a bundle product? =

No. A bundle is not a WooCommerce product itself — it's a saved list of items (real products/variations and/or custom items) that get added to the cart together when a customer visits the bundle's link.

= Can I change the `?bundle=` URL parameter? =

Yes — it's configurable from WooCommerce → Settings → Products → Virtual Bundles. Changing it takes effect immediately, but any previously shared links using the old parameter name will stop working, since the plugin does not support two parameter names at once.

= What happens if a bundle contains a product that's since been deleted or gone out of stock? =

Configurable from Settings: either skip the unavailable item and add the rest of the bundle, or block the whole bundle from being added. The admin list table and the bundle edit screen both show a "Needs attention" indicator on any bundle containing an item like this.

= Does this work with WooCommerce Cart & Checkout Blocks? =

Yes, alongside classic cart/checkout. Both are explicitly declared compatible and exercised by the plugin's cart integrity, coupon, and redemption-limit logic.

= Is this compatible with High-Performance Order Storage (HPOS)? =

Yes, compatibility is explicitly declared, and all order data is read/written through WooCommerce's own CRUD APIs.

== Screenshots ==

1. The Add/Edit Bundle screen.
2. The Virtual Bundles list table.
3. The Virtual Bundles settings section under WooCommerce → Settings → Products.

== Changelog ==

= 1.0.0 =
* Initial release.

== Upgrade Notice ==

= 1.0.0 =
Initial release.
