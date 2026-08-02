class TabbedCollection extends HTMLElement {
  connectedCallback() {
    this.tabs = Array.from(this.querySelectorAll('[data-tab]'));
    this.panels = Array.from(this.querySelectorAll('[data-panel]'));
    this.tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => this.activate(index));
      tab.addEventListener('keydown', (event) => this.handleKeydown(event, index));
    });

    if (Shopify.designMode) {
      this.addEventListener('shopify:block:select', (event) => {
        const index = this.tabs.findIndex((tab) => tab.id.endsWith(event.detail.blockId));
        if (index >= 0) this.activate(index, false);
      });
    }
  }

  activate(index, focus = true) {
    this.tabs.forEach((tab, tabIndex) => {
      const active = tabIndex === index;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
      this.panels[tabIndex].hidden = !active;
      this.panels[tabIndex].classList.toggle('is-active', active);
    });
    if (focus) this.tabs[index].focus();
  }

  handleKeydown(event, index) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % this.tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + this.tabs.length) % this.tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = this.tabs.length - 1;
    this.activate(next);
  }
}

if (!customElements.get('tabbed-collection')) {
  customElements.define('tabbed-collection', TabbedCollection);
}
