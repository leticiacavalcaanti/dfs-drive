import "./painel.css";

export const metadata = {
  title: "DFS: painel do sistema de arquivos distribuído",
  description: "Nós de armazenamento, réplicas de cada bloco e arquivos do DFS, com envio, download verificado por SHA-256 e drenagem de nós.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#dfdedb",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" data-radius="soft" data-buttons="tonal">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@75..100,400..700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
