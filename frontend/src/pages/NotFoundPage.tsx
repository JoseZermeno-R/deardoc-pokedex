import { Link } from 'react-router';
import { NotFound } from '../components/NotFound';

/** Any URL without a route. */
export function NotFoundPage() {
  return (
    <>
      <h1 className="sr-only">Page not found</h1>
      <NotFound message="This page doesn't exist.">
        <Link to="/">Back to the Pokédex</Link>
      </NotFound>
    </>
  );
}
