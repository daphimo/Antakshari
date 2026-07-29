import { CartLinesUpdateEvent, CartErrorEvent } from '@shopify/events';

class CartDrawerUpsell extends HTMLElement {
  connectedCallback() {
    this.button = this.querySelector('[data-upsell-add]');
    this.button?.addEventListener('click', this.addProduct);
  }

  disconnectedCallback() {
    this.button?.removeEventListener('click', this.addProduct);
  }

  addProduct = async () => {
    const variant = this.querySelector('[data-upsell-variant]');
    const variantId = variant?.value;
    if (!variantId || this.button?.hasAttribute('aria-busy')) return;

    this.button?.setAttribute('aria-busy', 'true');
    if (this.button) this.button.disabled = true;

    const sectionIds = [...document.querySelectorAll('cart-items-component[data-section-id]')]
      .map((component) => component.dataset.sectionId)
      .filter(Boolean);
    const deferred = CartLinesUpdateEvent.createPromise();

    this.dispatchEvent(new CartLinesUpdateEvent({
      action: 'add',
      context: 'product',
      lines: [{ merchandiseId: String(variantId), quantity: 1 }],
      promise: deferred.promise,
    }));

    try {
      const response = await fetch(Theme.routes.cart_add_url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          items: [{ id: Number(variantId), quantity: 1 }],
          sections: [...new Set(sectionIds)].join(','),
          sections_url: window.location.pathname,
        }),
      });
      const result = await response.json();

      if (!response.ok || result.status) {
        throw new Error(result.description || result.message || 'Unable to add this product.');
      }

      const cartResponse = await fetch(`${Theme.routes.cart_url}.js`, {
        headers: { Accept: 'application/json' },
      });
      if (!cartResponse.ok) throw new Error('Unable to refresh the cart.');
      const ajaxCart = await cartResponse.json();

      deferred.resolve({
        cart: CartLinesUpdateEvent.createCartFromAjaxResponse(ajaxCart),
        detail: {
          items: result.items,
          source: 'cart-drawer-upsell',
          sourceId: this.dataset.productId,
          itemCount: 1,
          sections: result.sections,
          didError: false,
        },
      });

      const status = this.querySelector('[data-upsell-status]');
      if (status) status.textContent = 'Product added to cart.';
      this.button?.removeAttribute('aria-busy');
      if (this.button) this.button.disabled = false;
    } catch (error) {
      deferred.reject(error);
      const message = error instanceof Error ? error.message : 'Unable to add this product.';
      this.dispatchEvent(new CartErrorEvent({ error: message, code: 'INVALID' }));
      const status = this.querySelector('[data-upsell-status]');
      if (status) {
        status.classList.remove('visually-hidden');
        status.textContent = message;
      }
      this.button?.removeAttribute('aria-busy');
      if (this.button) this.button.disabled = false;
    }
  };
}

if (!customElements.get('cart-drawer-upsell')) {
  customElements.define('cart-drawer-upsell', CartDrawerUpsell);
}
