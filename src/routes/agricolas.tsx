import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/agricolas")({
  beforeLoad: () => {
    throw redirect({
      to: "/",
      search: { categoria: "agricolas" },
    });
  },
  loader: () => null,
  component: () => null,
});
