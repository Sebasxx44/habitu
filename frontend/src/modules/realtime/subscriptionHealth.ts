// COMPUTEDS
export const subscriptionsAreReady = (
  transportConnected: boolean,
  required: Iterable<string>,
  subscribed: ReadonlySet<string>,
): boolean => {
  const channels = Array.from(required);
  return (
    transportConnected &&
    channels.length > 0 &&
    channels.every((channel) => subscribed.has(channel))
  );
};
