/** Respecteert OS-voorkeur voor minder beweging (o.a. GSAP-animaties). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
