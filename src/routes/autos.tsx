import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/autos")({
  beforeLoad: () => {
    throw redirect({
      to: "/",
      search: { categoria: "autos" },
    });
  },
  loader: () => null,
  component: () => null,
});
