// HELPERS
export const safeReturnPath = (value: string | null): string | null => {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    [...value].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return null;
  const path = value.split(/[?#]/)[0];
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(path);
  } catch {
    return null;
  }
  if (
    decodedPath.startsWith("//") ||
    decodedPath.includes("\\") ||
    /(?:^|\/)\.{1,2}(?:\/|$)/.test(decodedPath) ||
    [...decodedPath].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  ) return null;
  if (
    ["/login", "/register", "/forgot-password", "/reset-password"].includes(
      decodedPath,
    )
  )
    return null;
  return value;
};

export const accountPath = (path: string, search: string): string => {
  const destination = safeReturnPath(
    new URLSearchParams(search).get("returnTo"),
  );
  return destination
    ? `${path}?${new URLSearchParams({ returnTo: destination })}`
    : path;
};
