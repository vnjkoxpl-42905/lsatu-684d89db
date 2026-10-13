import { PaymentsPanel } from '@/components/teacher/PaymentsPanel';

export default function TeacherPayments() {
  return (
    <div className="flex flex-col gap-5 px-5 py-6 sm:px-6">
      <div>
        <h2 className="font-display text-2xl">Payments</h2>
        <p className="mt-1 text-sm text-black/55">Search payment history and handle payments needing attention.</p>
      </div>
      <PaymentsPanel />
    </div>
  );
}
