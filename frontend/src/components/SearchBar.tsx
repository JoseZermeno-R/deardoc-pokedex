import {
  type ChangeEvent,
  type SubmitEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import styles from './SearchBar.module.css';

const DEBOUNCE_MS = 300;

interface SearchBarProps {
  /** The current search, from the URL. */
  value: string;
  /** Called with the trimmed text, after a pause in typing or on Enter. */
  onSearch: (term: string) => void;
}

export function SearchBar({ value, onSearch }: SearchBarProps) {
  const [text, setText] = useState(value);
  const timer = useRef<number | undefined>(undefined);

  // The search can also change from outside (Clear search, the back button):
  // show it. Adjusting state during render avoids an extra effect pass.
  const [shownValue, setShownValue] = useState(value);
  if (value !== shownValue) {
    setShownValue(value);
    if (value !== text.trim()) setText(value);
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // The debounce lives in the handler, not in an effect, so a pending search
  // can never overwrite a URL that changed in the meantime.
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setText(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onSearch(next.trim()), DEBOUNCE_MS);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    window.clearTimeout(timer.current);
    onSearch(text.trim());
  }

  return (
    <form role="search" className={styles.form} onSubmit={handleSubmit}>
      <label htmlFor="pokemon-search" className={styles.label}>
        Search by name
      </label>
      <div className={styles.row}>
        <input
          id="pokemon-search"
          className={styles.input}
          type="search"
          value={text}
          onChange={handleChange}
          placeholder="Pikachu"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className={styles.button} aria-label="Search">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <circle
              cx="11"
              cy="11"
              r="7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <path
              d="m16.5 16.5 4 4"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}
