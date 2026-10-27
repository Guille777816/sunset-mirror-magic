import { createFileRoute, redirect } from "@tanstack/react-router";

const CATEGORY_MAP: Record<string, string> = {
  industrial: "industriales",
  industriales: "industriales",
  vial: "industriales",
  construccion: "industriales",
  mineria: "industriales",
  izaje: "industriales",
  carritos: "industriales",
  auto: "autos",
  autos: "autos",
  pasajero: "autos",
  camioneta: "camionetas",
  camionetas: "camionetas",
  "camioneta-comercial": "camionetas",
  camion: "camiones",
  camiones: "camiones",
  transporte: "camiones",
  agricola: "agricolas",
  agricolas: "agricolas",
  suv: "suv",
  bateria: "baterias",
  baterias: "baterias",
  lona: "lonas",
  lonas: "lonas",
  aceite: "aceites",
  aceites: "aceites",
  lubricante: "aceites",
  lubricantes: "aceites",
};

export const Route = createFileRoute("/categoria/$category")({
  beforeLoad: ({ params }) => {
    const rawCat = (params?.category || "").toLowerCase();
    const resolvedCat = CATEGORY_MAP[rawCat] || rawCat;
    throw redirect({
      to: "/",
      search: { categoria: resolvedCat },
    });
  },
  loader: () => null,
  component: () => null,
});
