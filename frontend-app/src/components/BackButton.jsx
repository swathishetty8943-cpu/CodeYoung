import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * A "← Back" link for pages like Login/Signup that people often land on
 * directly (e.g. a bookmark, a shared link, or after clicking "Book a Free
 * Trial" from the homepage). `navigate(-1)` alone isn't quite right here:
 * if there's no earlier in-app entry, it can land the user outside the app
 * entirely (or do nothing). We only step back through history when there's
 * something to step back to, and fall back to the homepage otherwise.
 */
export default function BackButton({ fallback = '/', label = 'Back' }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button type="button" className="back-button" onClick={handleClick} aria-label="Go back">
      <ArrowLeft size={16} /> {label}
    </button>
  );
}
