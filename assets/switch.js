document.addEventListener('DOMContentLoaded', () => {
  const switches = document.querySelectorAll('.addonswitch');

  switches.forEach((toggle) => {
    const targetId = toggle.dataset.id;
    const target = document.querySelector(
      `.addonswitch_container[data-id="${targetId}"]`
    );

    if (!target) return;

    // Initial state
    if (toggle.checked) {
      target.classList.add('is--active');
    } else {
      target.classList.remove('is--active');
    }

    toggle.addEventListener('change', () => {
      if (toggle.checked) {
        target.classList.add('is--active');
      } else {
        target.classList.remove('is--active');
      }
    });
  });
});