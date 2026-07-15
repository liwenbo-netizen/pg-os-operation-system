import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { ErrorBoundary } from "./app/ErrorBoundary";
import { LocaleProvider } from "./lib/i18n";
import "./styles.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </LocaleProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
