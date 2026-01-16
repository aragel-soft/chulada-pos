import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import './App.css';
import { ZoomProvider } from "@/providers/ZoomProvider";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ZoomProvider>
        <App />
      </ZoomProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);