import { Navigate, useLocation } from "react-router-dom";

/**
 * Read, Recall, Colour, reachable without waiting to be assigned it.
 *
 * The door used to exist only as an assignment: a student who had never been
 * given the section-library Activity had no address for it at all, even though
 * every section behind it is open to her and starting one is a server call that
 * builds its own Attempt. This is that same door at a permanent address, linked
 * from the Activities page.
 */
export default function ActivitySections() {
  const location = useLocation();
  return <Navigate replace to={`/reading-center/rrc${location.search}${location.hash}`} state={location.state} />;
}
