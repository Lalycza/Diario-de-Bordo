import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "tema";

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const isDark = saved
      ? saved === "escuro"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(isDark);
    applyTheme(isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next ? "escuro" : "claro");
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
      className={className}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span className="hidden sm:inline">{dark ? "Tema claro" : "Tema escuro"}</span>
    </Button>
  );
}
