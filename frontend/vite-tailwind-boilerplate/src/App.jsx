import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ProgressToday from "./pages/ProgressToday";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/progress/today" element={<ProgressToday />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
