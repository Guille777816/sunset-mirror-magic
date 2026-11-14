import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/camiones")({
  beforeLoad: () => {
    throw redirect({
      to: "/",
      search: { categoria: "camiones" },
    });
  },
  loader: () => null,
  component: () => null,
});
