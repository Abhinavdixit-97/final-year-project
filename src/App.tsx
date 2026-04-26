import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Problem from "./pages/Problem";
import Solution from "./pages/Solution";
import Technology from "./pages/Technology";
import Method from "./pages/Method";
import Results from "./pages/Results";
import ReferencesTeam from "./pages/ReferencesTeam";
import TeacherHub from "./pages/TeacherHub";
import StudentHub from "./pages/StudentHub";
import GlobalAskWidget from "./components/GlobalAskWidget";

const App = () => {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/problem" element={<Problem />} />
            <Route path="/solution" element={<Solution />} />
            <Route path="/technology" element={<Technology />} />
            <Route path="/method" element={<Method />} />
            <Route path="/results" element={<Results />} />
            <Route path="/references" element={<ReferencesTeam />} />
            <Route path="/teacher" element={<TeacherHub />} />
            <Route path="/student" element={<StudentHub />} />
          </Routes>
        </main>
        <Footer />
        <GlobalAskWidget />
      </div>
    </BrowserRouter>
  );
};

export default App;
