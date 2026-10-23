import { SLOGAN } from "@/lib/brand";

/** «Plantéalo. Míralo. Vívelo.»: las dos primeras en tinta y la última en terracota, como en el outro de los videos. */
export function Slogan({ className = "" }: { className?: string }) {
  return (
    <p className={`font-display font-extrabold tracking-tight ${className}`}>
      {SLOGAN.slice(0, -1).join(" ")} <span className="text-[#a4552d]">{SLOGAN[SLOGAN.length - 1]}</span>
    </p>
  );
}
