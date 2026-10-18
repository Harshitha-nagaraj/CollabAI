'use client';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
    </div>
  );
}

export function KanbanColumnSkeleton() {
  return (
    <div className="flex-1 min-w-[300px] space-y-3">
      <Skeleton className="h-6 w-28" />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
    </div>
  );
}
