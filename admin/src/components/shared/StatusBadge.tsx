import { cn } from '@/lib/utils';

type StatusType =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Open'
  | 'In Progress'
  | 'Resolved'
  | 'Published'
  | 'Draft'
  | 'Passed'
  | 'Failed'
  | 'Incomplete'
  | 'Active'
  | 'On Leave'
  | 'Graduated'
  | 'Suspended';

const statusStyles: Record<StatusType, string> = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Approved: 'bg-green-100 text-green-800 border-green-200',
  Rejected: 'bg-red-100 text-red-800 border-red-200',
  Open: 'bg-blue-100 text-blue-800 border-blue-200',
  'In Progress': 'bg-amber-100 text-amber-800 border-amber-200',
  Resolved: 'bg-green-100 text-green-800 border-green-200',
  Published: 'bg-green-100 text-green-800 border-green-200',
  Draft: 'bg-gray-100 text-gray-600 border-gray-200',
  Passed: 'bg-green-100 text-green-800 border-green-200',
  Failed: 'bg-red-100 text-red-800 border-red-200',
  Incomplete: 'bg-amber-100 text-amber-800 border-amber-200',
  Active: 'bg-green-100 text-green-800 border-green-200',
  'On Leave': 'bg-blue-100 text-blue-800 border-blue-200',
  Graduated: 'bg-purple-100 text-purple-800 border-purple-200',
  Suspended: 'bg-red-100 text-red-800 border-red-200',
};

const dotStyles: Record<StatusType, string> = {
  Pending: 'bg-amber-500',
  Approved: 'bg-green-500',
  Rejected: 'bg-red-500',
  Open: 'bg-blue-500',
  'In Progress': 'bg-amber-500',
  Resolved: 'bg-green-500',
  Published: 'bg-green-500',
  Draft: 'bg-gray-400',
  Passed: 'bg-green-500',
  Failed: 'bg-red-500',
  Incomplete: 'bg-amber-500',
  Active: 'bg-green-500',
  'On Leave': 'bg-blue-500',
  Graduated: 'bg-purple-500',
  Suspended: 'bg-red-500',
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({
  status,
  className,
  showDot = false,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold capitalize',
        statusStyles[status],
        className
      )}
    >
      {showDot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', dotStyles[status])} />
      )}
      {status}
    </span>
  );
}
