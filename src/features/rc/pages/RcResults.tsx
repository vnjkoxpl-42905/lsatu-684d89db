import { useParams } from 'react-router-dom';
import '../rc.css';

/** Placeholder until Phase E. The player already navigates here on completion. */
export default function RcResults() {
  const { sessionId } = useParams();
  return (
    <div className="rc-page">
      <h1>Results</h1>
      <p className="rc-page-sub">Session {sessionId}</p>
    </div>
  );
}
