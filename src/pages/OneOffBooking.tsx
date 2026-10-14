import { useParams } from "react-router-dom";

import SingleSession from "./SingleSession";

/**
 * A one-off booking link: /book/x/<slug>.
 *
 * There is no separate booking page here, and there should not be. The slug in
 * the URL names a booking_event_types row, and that row already carries
 * everything that makes this link different -- its price, its length, its
 * notice, and sometimes the one time it sells. SingleSession is driven entirely
 * by that row, so it renders a one-off link correctly by knowing nothing about
 * the idea.
 */
export default function OneOffBooking() {
  const { slug } = useParams<{ slug: string }>();
  return <SingleSession event={slug ?? ""} />;
}
