import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "tema-v3";

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // O padrão do sistema é sempre escuro. A chave v2 evita que uma
    // preferência "claro" antiga force o portal a abrir em tema claro.
    const isDark = saved === "claro" ? false : true;
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
    </Button>
  );
}
