import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ThemeProvider } from "./context/ThemeContext";
import { DocumentsPage } from "./pages/DocumentsPage";
import { SearchPage } from "./pages/SearchPage";
import { UploadPage } from "./pages/UploadPage";

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<UploadPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}
