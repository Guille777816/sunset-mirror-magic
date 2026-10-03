import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";

export function FloatingSearchButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled down past hero (e.g. 350px)
      if (window.scrollY > 350) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    const el = document.getElementById("buscador");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <button
        onClick={handleClick}
        className="flex items-center gap-2.5 rounded-full border border-white/20 bg-neutral-900/90 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-neutral-900 hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-[#E3151A]"
        aria-label="Buscar cubiertas por medida"
      >
        <Search className="h-4 w-4 text-[#E3151A]" />
        <span>Buscar por medida</span>
      </button>
    </div>
  );
}
