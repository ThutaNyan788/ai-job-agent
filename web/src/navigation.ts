import { useEffect, useState, type MouseEvent } from "react";

export function navigate(path: string) {
  if (location.pathname === path) return;
  history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "instant" });
}

export function usePathname() {
  const [pathname, setPathname] = useState(location.pathname);

  useEffect(() => {
    const updatePath = () => setPathname(location.pathname);
    window.addEventListener("popstate", updatePath);
    return () => window.removeEventListener("popstate", updatePath);
  }, []);

  return pathname;
}

export function handleInternalLink(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  const url = new URL(event.currentTarget.href);
  if (url.origin !== location.origin || url.hash) return;

  event.preventDefault();
  navigate(`${url.pathname}${url.search}`);
}
