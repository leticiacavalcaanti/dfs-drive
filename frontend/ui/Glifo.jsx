const TRACOS = {
  pasta: "M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2h9A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z",
  arquivo: "M6 3.5h8l4 4v13H6zM14 3.5v4h4",
  baixar: "M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14",
  enviar: "M12 20V9M7.5 13.5 12 9l4.5 4.5M5 4.5h14",
  remover: "M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13",
  copiar: "M9 9h10v11H9zM15 9V4H5v11h4",
  fechar: "M6 6l12 12M18 6 6 18",
  mais: "M12 5v14M5 12h14",
  seta: "M5 12h13M13 7l5 5-5 5",
  subir: "M15 18 9 12l6-6",
  diario: "M5 6h14M5 12h14M5 18h9",
  check: "M5 12.5 10 17l9-10",
};

export default function Glifo({ nome, tamanho = 20 }) {
  return (
    <svg className="glifo" width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={TRACOS[nome]} />
    </svg>
  );
}
