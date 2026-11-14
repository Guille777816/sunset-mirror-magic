import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/suv")({
  beforeLoad: () => {
    throw redirect({
      to: "/",
      search: { categoria: "suv" },
    });
  },
  loader: () => null,
  component: () => null,
});
