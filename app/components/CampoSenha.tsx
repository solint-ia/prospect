"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Campo de senha com botão de ver/ocultar.
 * O botão fica fora da ordem de tabulação para não atrapalhar quem navega
 * pelo teclado entre os campos do formulário.
 */
export default function CampoSenha({
  label,
  value,
  onChange,
  className,
  dica,
  ...props
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  className: string;
  dica?: React.ReactNode;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "className"
>) {
  const [visivel, setVisivel] = useState(false);
  const id = useId();

  return (
    <div className="block">
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-slate-300"
      >
        {label}
      </label>

      <div className="relative">
        <input
          {...props}
          id={id}
          type={visivel ? "text" : "password"}
          value={value}
          onChange={(evento) => onChange(evento.target.value)}
          className={`${className} pr-11`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisivel((atual) => !atual)}
          disabled={props.disabled}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
          title={visivel ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-white/10 hover:text-slate-200 disabled:opacity-40"
        >
          {visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {dica}
    </div>
  );
}
