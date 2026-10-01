import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ConditionalBootcampRoutes } from '@/bootcamps/conditionals/routes';
import '@/bootcamps/main-conclusion/styles/scoped.css';
import '@/bootcamps/conditionals/styles.css';
import { conditionalUnits } from '@/bootcamps/conditionals/content';

export default function ConditionalBootcamp() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p role="status">Loading your account...</p>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!location.pathname.startsWith('/bootcamp/conditionals')) return <div className="mc-bootcamp conditional-bootcamp"><section className="cb-main"><span className="cb-label">Conditional bootcamp</span><h1>Learn it. Work it through. Practice the exact skill.</h1><p>A progressive path from conditional foundations through complex language and LR application. Quantifiers follow as a separately accessible phase.</p><Link className="cb-button cb-primary" to="/bootcamp/conditionals">Open the complete bootcamp</Link><div className="cb-grid" style={{ marginTop: 24 }}>{conditionalUnits.map(unit => <article className="cb-card" key={unit.id}><h3>{unit.title}</h3><p>{unit.goal}</p><Link to={`/bootcamp/conditionals/lessons/${unit.id}`}>Open lesson</Link></article>)}</div></section></div>;
  return <div className="mc-bootcamp conditional-bootcamp"><ConditionalBootcampRoutes key={user.id} userId={user.id} /></div>;
}
