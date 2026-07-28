document.addEventListener("click", (event) => {
  const menuTrigger = event.target.closest("[data-mobile-bottom-menu]");
  if (!menuTrigger) return;

  event.preventDefault();
  const premiumMenuTrigger = document.querySelector(
    ".premium-header [data-drawer-open]"
  );

  premiumMenuTrigger?.click();
});
