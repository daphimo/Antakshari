import { CartLinesUpdateEvent, CartErrorEvent } from '@shopify/events';

if (!window.__switchUpsellAddBound) {
  window.__switchUpsellAddBound = true;

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('.prop-add-btn');
    if (!button || button.disabled || button.hasAttribute('aria-busy')) return;

    const card = button.closest('.prop-card');
    const variantId = Number(card?.dataset.addItemId);
    if (!variantId) return;

    const sectionIds = [...document.querySelectorAll('cart-items-component[data-section-id]')]
      .map((component) => component.dataset.sectionId)
      .filter(Boolean);
    const deferred = CartLinesUpdateEvent.createPromise();

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Adding…';

    card.dispatchEvent(new CartLinesUpdateEvent({
      action: 'add',
      context: 'product',
      lines: [{ merchandiseId: String(variantId), quantity: 1 }],
      promise: deferred.promise,
    }));

    try {
      const response = await fetch(Theme.routes.cart_add_url, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({
          items: [{ id: variantId, quantity: 1 }],
          sections: [...new Set(sectionIds)].join(','),
          sections_url: window.location.pathname,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.status) throw new Error(result.description || result.message || 'Unable to add item.');

      const cartResponse = await fetch(`${Theme.routes.cart_url}.js`, { headers: { Accept: 'application/json' } });
      if (!cartResponse.ok) throw new Error('Unable to refresh the cart.');
      const ajaxCart = await cartResponse.json();

      deferred.resolve({
        cart: CartLinesUpdateEvent.createCartFromAjaxResponse(ajaxCart),
        detail: { items: result.items, source: 'switch-upsell', itemCount: 1, sections: result.sections, didError: false },
      });

      button.textContent = 'Added';
      const drawer = document.querySelector('theme-drawer#cart-drawer');
      if (typeof drawer?.open === 'function') requestAnimationFrame(() => drawer.open());
    } catch (error) {
      deferred.reject(error);
      const message = error instanceof Error ? error.message : 'Unable to add item.';
      card.dispatchEvent(new CartErrorEvent({ error: message, code: 'INVALID' }));
      button.textContent = 'Try again';
    } finally {
      button.removeAttribute('aria-busy');
      window.setTimeout(() => {
        button.textContent = 'Add item';
        button.disabled = false;
      }, 1200);
    }
  });
}
