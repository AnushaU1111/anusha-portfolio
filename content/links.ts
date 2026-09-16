import { asset } from "@/lib/basePath";
import { Link } from "./schema";

/**
 * The single source for contact links. Both the closing scene and the nav
 * drawer read from here, so an address is edited in exactly one place.
 */
export const links: Link[] = [
  { label: "Email", href: "mailto:anushaupadhyay1111@gmail.com", reveal: "anushaupadhyay1111@gmail.com" },
  { label: "GitHub", href: "https://github.com/AnushaU1111", reveal: "github.com/AnushaU1111" },
  { label: "LinkedIn", href: "https://linkedin.com/in/upadhyay-anusha", reveal: "linkedin.com/in/upadhyay-anusha" },
  // Served straight out of public/, so the router never sees it and it has to
  // carry the subpath itself.
  { label: "Résumé", href: asset("/resume.pdf"), reveal: "PDF, 1 page" },
].map((l) => Link.parse(l));
