import { RcHubSurface } from '../components/RcHubSurface';

/**
 * The standalone /rc page.
 *
 * The builder itself now lives in `RcHubSurface`, because the drill hub's RC
 * section mounts the same component (`?section=rc&stage=type-drill`). Both
 * doors run one builder — the toggle in the hub is the door a student is
 * expected to use, and this route stays because links to it are in the wild.
 */
export default function RcHub() {
  return <RcHubSurface />;
}
