import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';

import Layout from './components/Layout';
import Home from './pages/Home';
import Experience from './pages/Experience';
import Blog from './pages/Blog';
import PostArticle from './pages/PostArticle';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="experience" element={<Experience />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<PostArticle />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
