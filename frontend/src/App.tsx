import { Link, Route, Routes } from 'react-router';
import styles from './App.module.css';
import { ToastProvider } from './components/Toast';
import { NotFoundPage } from './pages/NotFoundPage';
import { PokedexPage } from './pages/PokedexPage';
import { PokemonDetailPage } from './pages/PokemonDetailPage';

function App() {
  return (
    <ToastProvider>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            <img src="/favicon.svg" alt="" width={28} height={28} />
            Pokédex
          </Link>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<PokedexPage />} />
          <Route path="/pokemon/:name" element={<PokemonDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </ToastProvider>
  );
}

export default App;
