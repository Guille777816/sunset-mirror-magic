import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/medida/$medida")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/",
      search: { medida: params.medida },
    });
  },
  loader: () => null,
  component: () => null,
});
