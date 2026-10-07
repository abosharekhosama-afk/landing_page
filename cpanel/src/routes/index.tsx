import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
// @ts-expect-error - JSX file without types
import App from "../App.jsx";

function ClientApp() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <App />;
}

export const Route = createFileRoute("/")({
  component: ClientApp,
});
