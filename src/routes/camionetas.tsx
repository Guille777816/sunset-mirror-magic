import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/camionetas")({
  beforeLoad: () => {
    throw redirect({
      to: "/",
      search: { categoria: "camionetas" },
    });
  },
  loader: () => null,
  component: () => null,
});
