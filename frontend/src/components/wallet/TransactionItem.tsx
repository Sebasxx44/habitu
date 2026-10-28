import { cn } from '@/lib/utils'
import { formatDate, formatCurrency } from '@/utils/dateUtils'
import { ArrowDownLeft, ArrowUpRight, RotateCcw, Undo2 } from 'lucide-react'

import type { WalletTransaction } from '@/composables/wallet/types'
export type Transaction = WalletTransaction

const typeConfig = {
  CREDIT: {
    icon: ArrowDownLeft,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    prefix: '+',
  },
  DEBIT: {
    icon: ArrowUpRight,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    prefix: '-',
  },
  CASHBACK: {
    icon: RotateCcw,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    prefix: '+',
  },
  REFUND: {
    icon: Undo2,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    prefix: '+',
  },
}

interface TransactionItemProps {
  transaction: Transaction
}

export const TransactionItem = ({ transaction }: TransactionItemProps) => {
  const kind = transaction.type === 'TOPUP' || transaction.type === 'PAYOUT' ? 'CREDIT' : transaction.type
  const config = typeConfig[kind] || typeConfig.CREDIT
  const Icon = config.icon

  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all duration-300 group">
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', config.bg)}>
        <Icon className={cn('w-5 h-5', config.color)} />
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-black tracking-tight truncate">
          {transaction.description || 'Transacción'}
        </p>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
          {formatDate(transaction.created_at)}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className={cn('text-sm font-black', config.color)}>
          {config.prefix}{formatCurrency(Number(transaction.amount))}
        </p>
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
          {transaction.type}
        </p>
      </div>
    </div>
  )
}
