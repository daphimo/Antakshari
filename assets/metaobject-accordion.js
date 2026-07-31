if (!customElements.get('metaobject-accordion')) {
  customElements.define(
    'metaobject-accordion',
    class extends HTMLElement {
      connectedCallback() {
        this.button = this.querySelector('.metaobject-accordion__toggle');
        this.content = this.querySelector('.metaobject-accordion__content');
        if (!this.button || !this.content) return;

        this.button.addEventListener('click', () => this.toggle());
        this.content.addEventListener('transitionend', (event) => {
          if (event.propertyName === 'height' && this.button.getAttribute('aria-expanded') === 'true') {
            this.content.style.height = 'auto';
          }
        });

        if (this.isOpen) {
          document.querySelectorAll('metaobject-accordion').forEach((accordion) => {
            if (accordion !== this && accordion.isOpen) accordion.close();
          });
        }
      }

      toggle() {
        if (this.isOpen) {
          this.close();
          return;
        }

        document.querySelectorAll('metaobject-accordion').forEach((accordion) => {
          if (accordion !== this && accordion.isOpen) accordion.close();
        });

        this.open();
      }

      get isOpen() {
        return this.button?.getAttribute('aria-expanded') === 'true';
      }

      open() {
        this.button.setAttribute('aria-expanded', 'true');
        this.content.setAttribute('aria-hidden', 'false');
        this.content.style.height = `${this.content.scrollHeight}px`;
      }

      close() {
        this.button.setAttribute('aria-expanded', 'false');
        this.content.setAttribute('aria-hidden', 'true');
        this.content.style.height = `${this.content.scrollHeight}px`;
        requestAnimationFrame(() => {
          this.content.style.height = '0px';
        });
      }
    }
  );
}
