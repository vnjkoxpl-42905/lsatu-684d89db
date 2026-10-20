import { useContext } from 'react';
import { FixtureActor } from './mockAuth';
export function useUserPermissions() {
  return { loading: false, is_admin: useContext(FixtureActor) === 'fixture-admin' };
}
