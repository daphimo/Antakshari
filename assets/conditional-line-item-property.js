if (!customElements.get('conditional-line-item-property')) {
  customElements.define(
    'conditional-line-item-property',
    class extends HTMLElement {
      connectedCallback() {
        this.checkbox = this.querySelector('[data-property-toggle]');
        this.fieldWrapper = this.querySelector('[data-property-field]');
        this.textInput = this.querySelector('[data-property-input]');
        if (!this.checkbox || !this.fieldWrapper || !this.textInput) return;

        this.checkbox.addEventListener('change', () => this.update());
        this.update();
      }

      update() {
        const isSelected = this.checkbox.checked;
        this.checkbox.setAttribute('aria-expanded', String(isSelected));
        this.fieldWrapper.hidden = !isSelected;
        this.textInput.disabled = !isSelected;

        if (isSelected) {
          requestAnimationFrame(() => this.textInput.focus({ preventScroll: true }));
        }
      }
    }
  );
}
