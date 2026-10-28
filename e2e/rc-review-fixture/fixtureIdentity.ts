const params = new URLSearchParams(location.search);
export const fixtureRun = encodeURIComponent(params.get('run') ?? 'default');
export const trainingFixtureSessionId = `fixture-training-session-${fixtureRun}`;
