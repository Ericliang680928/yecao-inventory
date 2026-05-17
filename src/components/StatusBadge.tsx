import type { BatchStatus } from '../types'

interface Props {
  status: BatchStatus | '未盤' | '已盤' | '有差異' | '已覆核'
  size?: 'sm' | 'md'
}

const MAP: Record<string, string> = {
  '進行中': 'badge-counted',
  '待覆核': 'badge-diff',
  '已結案': 'badge-closed',
  '未盤':   'badge-uncounted',
  '已盤':   'badge-counted',
  '有差異': 'badge-diff',
  '已覆核': 'badge-reviewed',
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const cls = MAP[status] || 'badge-uncounted'
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  return (
    <span className={`inline-block rounded-full font-medium ${cls} ${pad}`}>
      {status}
    </span>
  )
}
