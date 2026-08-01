import { CartLinesUpdateEvent, CartErrorEvent } from '@shopify/events';

class LehengaSetSelector extends HTMLElement {
  connectedCallback() {
    this.tabs = [...this.querySelectorAll('[data-set-tab]')];
    this.panels = [...this.querySelectorAll('[data-set-panel]')];
    this.status = this.querySelector('[data-set-status]');
    this.currency = this.dataset.currency || 'INR';
    this.addEventListener('click', this.handleClick);
    this.addEventListener('change', this.handleChange);
    this.addEventListener('keydown', this.handleKeydown);
    this.panels.forEach((panel) => this.updatePanel(panel));
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('change', this.handleChange);
    this.removeEventListener('keydown', this.handleKeydown);
  }

  handleClick = (event) => {
    const tab = event.target.closest('[data-set-tab]');
    if (tab) {
      this.activateTab(tab.dataset.setTab, true);
      return;
    }

    const button = event.target.closest('[data-set-add]');
    if (button) this.addSelection(button);
  };

  handleChange = (event) => {
    const control = event.target.closest('[data-set-variant]');
    if (!control) return;

    if (control.hasAttribute('data-main-variant') && control.value) {
      this.querySelectorAll('[data-main-variant]').forEach((otherControl) => {
        if (otherControl !== control && [...otherControl.options].some((option) => option.value === control.value)) {
          otherControl.value = control.value;
        }
      });
    }

    this.panels.forEach((panel) => this.updatePanel(panel));
  };

  handleKeydown = (event) => {
    const tab = event.target.closest('[data-set-tab]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    const currentIndex = this.tabs.indexOf(tab);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? this.tabs.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + this.tabs.length) % this.tabs.length;
    this.activateTab(this.tabs[nextIndex].dataset.setTab, true);
  };

  activateTab(name, focus = false) {
    this.tabs.forEach((tab) => {
      const active = tab.dataset.setTab === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    });
    this.panels.forEach((panel) => {
      panel.hidden = panel.dataset.setPanel !== name;
    });
  }

  getVariant(row) {
    const control = row.querySelector('[data-set-variant]');
    if (!control?.value) return null;

    const source = control instanceof HTMLSelectElement ? control.selectedOptions[0] : control;
    return {
      id: control.value,
      price: Number.parseInt(source?.dataset.price || '0', 10),
      available: source?.dataset.available === 'true',
    };
  }

  getLines(panel) {
    return [...panel.querySelectorAll('[data-set-item]')].flatMap((row) => {
      const variant = this.getVariant(row);
      if (!variant?.id || !variant.available) return [];
      return [{ id: Number(variant.id), quantity: 1, price: variant.price }];
    });
  }

  formatMoney(cents) {
    return new Intl.NumberFormat(document.documentElement.lang || 'en-IN', {
      style: 'currency',
      currency: this.currency,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  }

  updatePanel(panel) {
    const rows = [...panel.querySelectorAll('[data-set-item]')];
    let total = 0;
    let complete = rows.length > 0;

    rows.forEach((row) => {
      const variant = this.getVariant(row);
      const price = row.querySelector('[data-item-price]');
      if (!variant?.available) {
        complete = false;
        total += Number.parseInt(row.dataset.basePrice || '0', 10);
        return;
      }
      total += variant.price;
      if (price) price.textContent = this.formatMoney(variant.price);
    });

    const totalElement = panel.querySelector('[data-set-total]');
    const button = panel.querySelector('[data-set-add]');
    if (totalElement) totalElement.textContent = this.formatMoney(total);
    if (button && !button.hasAttribute('aria-busy')) button.disabled = !complete;
  }

  addSelection = async (button) => {
    const panel = button.closest('[data-set-panel]');
    if (!panel || button.hasAttribute('aria-busy')) return;

    const rows = [...panel.querySelectorAll('[data-set-item]')];
    const lines = this.getLines(panel);
    if (!lines.length || lines.length !== rows.length) {
      this.showError('Please select an available size for every item.');
      return;
    }

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    this.status?.classList.add('visually-hidden');

    const sectionIds = [...document.querySelectorAll('cart-items-component[data-section-id]')]
      .map((component) => component.dataset.sectionId)
      .filter(Boolean);
    const deferred = CartLinesUpdateEvent.createPromise();

    this.dispatchEvent(new CartLinesUpdateEvent({
      action: 'add',
      context: 'product',
      lines: lines.map((line) => ({ merchandiseId: String(line.id), quantity: 1 })),
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
          items: lines.map(({ id, quantity }) => ({ id, quantity })),
          sections: [...new Set(sectionIds)].join(','),
          sections_url: window.location.pathname,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.status) {
        throw new Error(result.description || result.message || 'Unable to add this selection.');
      }

      const cartResponse = await fetch(`${Theme.routes.cart_url}.js`, { headers: { Accept: 'application/json' } });
      if (!cartResponse.ok) throw new Error('Unable to refresh the cart.');
      const ajaxCart = await cartResponse.json();

      deferred.resolve({
        cart: CartLinesUpdateEvent.createCartFromAjaxResponse(ajaxCart),
        detail: {
          items: result.items,
          source: 'lehenga-set-selector',
          sourceId: this.id,
          itemCount: lines.length,
          sections: result.sections,
          didError: false,
        },
      });

      if (this.status) {
        this.status.textContent = lines.length > 1 ? 'Set added to cart.' : 'Product added to cart.';
        this.status.classList.remove('visually-hidden');
      }

      const cartDrawer = document.querySelector('theme-drawer#cart-drawer');
      if (typeof cartDrawer?.open === 'function') requestAnimationFrame(() => cartDrawer.open());
    } catch (error) {
      deferred.reject(error);
      const message = error instanceof Error ? error.message : 'Unable to add this selection.';
      this.dispatchEvent(new CartErrorEvent({ error: message, code: 'INVALID' }));
      this.showError(message);
    } finally {
      button.removeAttribute('aria-busy');
      this.updatePanel(panel);
    }
  };

  showError(message) {
    if (!this.status) return;
    this.status.textContent = message;
    this.status.classList.remove('visually-hidden');
  }
}

if (!customElements.get('lehenga-set-selector')) {
  customElements.define('lehenga-set-selector', LehengaSetSelector);
}
