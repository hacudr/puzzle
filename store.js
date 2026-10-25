// Purchases. In the iOS app each collection is a non-consumable in-app purchase,
// bought through the App Store (StoreKit 2, by way of the @capgo/native-purchases
// plugin, which Capacitor's runtime, capacitor.js, reaches; build.js puts that in
// the app's copy of the page only). On the web there is no store, and buying is
// only simulated, as it always was.
//
// The App Store is the record of what is owned: on each start the app asks it
// which collections this Apple Account owns, and a refunded one drops out. What it
// last said is kept in localStorage too (by app.js), so the app opens in colour
// at once, and offline.
const store = (() => {
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform() && cap.registerPlugin);
  const plugin = native ? cap.registerPlugin('NativePurchases') : null;
  // the App Store's own product details, by product id: its price in the local currency
  const products = new Map();
  let told = () => {};

  // the product ids this Apple Account owns now
  async function owned() {
    const { purchases } = await plugin.getPurchases({ onlyCurrentEntitlements: true });
    return new Set(purchases.filter((t) => !t.revocationDate).map((t) => t.productIdentifier));
  }
  async function tell() {
    try {
      told(await owned());
    } catch (e) {
      console.warn('store: could not read purchases', e);
    }
  }

  return {
    native,

    // Asks the App Store for the products' prices and for what is owned, and
    // calls onOwned(ids) with the owned ids whenever that is known or changes,
    // as when a purchase made on another device, or one awaiting a parent's
    // approval, comes through.
    async start(ids, onOwned) {
      if (!native) return;
      told = onOwned;
      plugin.addListener('transactionUpdated', tell).catch(() => {});
      try {
        const { products: list } = await plugin.getProducts({ productIdentifiers: ids, productType: 'inapp' });
        list.forEach((p) => products.set(p.identifier, p));
      } catch (e) {
        console.warn('store: could not load products', e);
      }
      await tell();
    },

    // the App Store's price for a product, formatted in the local currency, or null
    price: (id) => (products.get(id) ? products.get(id).priceString : null),
    // the sum of several products' prices, as a number, or null if any is unknown
    amount(ids) {
      const list = ids.map((id) => products.get(id));
      if (!list.length || list.some((p) => !p)) return null;
      return list.reduce((s, p) => s + p.price, 0);
    },
    // an amount in the App Store's currency, formatted, or null if no price is known
    format(n) {
      const any = products.values().next().value;
      if (!any || n == null) return null;
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: any.currencyCode }).format(n);
      } catch {
        return null;
      }
    },

    // Buys one product. Resolves to 'bought', 'cancelled' (the buyer said no) or
    // 'pending' (Ask to Buy: it comes through later, by way of onOwned); throws
    // on any other failure. On the web it always succeeds.
    async buy(id) {
      if (!native) return 'bought';
      try {
        const t = await plugin.purchaseProduct({ productIdentifier: id, productType: 'inapp', quantity: 1 });
        await tell();
        return t && t.productIdentifier === id ? 'bought' : 'cancelled';
      } catch (e) {
        const message = String((e && e.message) || e);
        if (/cancel/i.test(message)) return 'cancelled';
        if (/pending/i.test(message)) return 'pending';
        throw e;
      }
    },

    // Restore Purchases, as Apple asks every app with in-app purchases to offer:
    // syncs with the App Store, then reports what is owned.
    async restore() {
      if (!native) return null;
      await plugin.restorePurchases();
      const ids = await owned();
      told(ids);
      return ids;
    },
  };
})();
