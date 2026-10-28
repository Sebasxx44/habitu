<?php

namespace App\Core\Enums;

enum WalletTransactionType: string
{
    case CREDIT = 'CREDIT';
    case DEBIT = 'DEBIT';
    case CASHBACK = 'CASHBACK';
    case REFUND = 'REFUND';
    case TOPUP = 'TOPUP';
    case PAYOUT = 'PAYOUT';
}
