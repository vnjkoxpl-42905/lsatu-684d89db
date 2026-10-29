import { createContext, useContext } from 'react';
export const FixtureActor = createContext('fixture-a');
export function useAuth() { return { user: { id: useContext(FixtureActor) }, loading: false }; }
