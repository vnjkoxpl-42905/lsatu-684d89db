import * as React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { safeReviewHubReturn } from '@/lib/reviewHubReturn';
import { SectionReport } from '@/components/section-report/SectionReport';

export default function SectionReportPage() {
  const { historyId } = useParams<{ historyId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedReturn = searchParams.get('returnTo');
  const returnTo = safeReviewHubReturn(requestedReturn) ?? '/review/history';
  const [refreshKey] = React.useState(0);

  return (
    <SectionReport
      historyId={historyId ?? null}
      onBack={() => navigate(returnTo)}
      backLabel={requestedReturn ? 'Back' : 'Back to History'}
      refreshKey={refreshKey}
    />
  );
}
