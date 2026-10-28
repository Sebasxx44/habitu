// CHECKOUT NAVIGATION
export const paymentRedirect = (
  value: string,
  provider: "wompi" | "mercadopago",
): void => {
  const url = new URL(value);
  const allowed =
    provider === "wompi"
      ? url.hostname === "checkout.wompi.co" && url.pathname === "/p/"
      : /^([a-z0-9-]+\.)*mercadopago\.(com|com\.co|com\.ar|com\.mx|com\.br|cl|com\.pe|com\.uy)$/.test(
          url.hostname,
        );
  if (url.protocol !== "https:" || !allowed || url.username || url.password)
    throw new Error("Invalid checkout address");
  window.location.assign(url.href);
};
