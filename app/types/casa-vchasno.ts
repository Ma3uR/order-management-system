// Casa.vchasno API Types
// Based on https://kasa.vchasno.ua/api/v3 documentation

export enum TaskType {
  SALE = 1,
  RETURN = 2,
  Z_REPORT = 11,
  SHIFT_STATUS = 18
}

export enum PaymentType {
  CASH = 0,
  CARD = 1,
  OTHER = 2
}

export enum TaxGroup {
  VAT_20 = 1,
  VAT_7 = 2,
  VAT_0 = 3,
  NO_VAT = 4
}

export enum DiscountType {
  AMOUNT = 0,
  PERCENTAGE = 1
}

// Request Types
export interface UserInfo {
  email?: string;
  phone?: string;
}

export interface ReceiptRow {
  code: string;
  name: string;
  cnt: number;
  price: number;
  disc?: number;
  taxgrp: string | number;
  pop?: string;
  code1?: string;
  code2?: string;
  code_a?: string;
  code_aa?: string[];
  comment?: string;
}

export interface Payment {
  type: PaymentType;
  sum: number;
  change?: number;
  commission?: number;
  paysys?: string;
  rrn?: string;
  oper_type?: string;
  cardmask?: string;
  term_id?: string;
  bank_name?: string;
  bank_id?: string;
  auth_code?: string;
  comment?: string;
  show_additional_info?: boolean;
}

export interface Receipt {
  sum: number;
  round?: number;
  comment_up?: string;
  comment_down?: string;
  disc?: number;
  disc_type?: DiscountType;
  rows: ReceiptRow[];
  pays: Payment[];
}

export interface FiscalData {
  task: TaskType;
  cashier: string;
  receipt?: Receipt;
}

export interface CasaVchasnoRequest {
  source: string;
  userinfo?: UserInfo;
  fiscal: FiscalData;
}

// Response Types
export interface ReceiptInfo {
  task: number;
  fisid: string;
  dataid: number;
  doccode: string;
  dt: string;
  cashier: string;
  dtype: number;
  isprint: number;
  isoffline: boolean;
  safe: number;
  shift_link: number;
  docno: number;
  cancelid: string;
  qr: string;
  mac: string;
  receipt?: ZReportReceiptInfo;
  summary?: ZReportSummary;
  taxes?: ZReportTaxDetail[];
  pays?: ZReportPaymentMethod[];
  money?: ZReportMoneyFlow[];
  cash?: ZReportCashFlow[];
  money_transfer?: unknown[];
}

export interface CasaVchasnoResponse {
  task: number;
  type: number;
  ver: number;
  source: string;
  device: string;
  tag: string;
  dt: string;
  res: number;
  res_action: number;
  errortxt: string;
  warnings: unknown[];
  info: ReceiptInfo | ShiftStatusInfo;
  error_extra: unknown;
}

// Z-Report specific types
export interface ZReportReceiptInfo {
  count_p: number;
  count_m: number;
  count_14: number;
  count_transfer: number;
  last_docno_p: number;
  last_docno_m: number;
}

export interface ZReportSummary {
  base_p: number;
  base_m: number;
  taxex_p: number;
  taxex_m: number;
  disc_p: number;
  disc_m: number;
}

export interface ZReportTaxDetail {
  gr_code: number;
  base_sum_p: number;
  base_sum_m: number;
  base_tax_sum_p: number;
  base_tax_sum_m: number;
  base_ex_sum_p: number;
  base_ex_sum_m: number;
  tax_name: string;
  tax_fname: string;
  tax_lit: string;
  tax_percent: number;
  tax_sum_p: number;
  tax_sum_m: number;
  ex_name: string;
  ex_percent: number;
  ex_sum_p: number;
  ex_sum_m: number;
}

export interface ZReportPaymentMethod {
  type: number;
  name: string;
  sum_p: number;
  sum_m: number;
  round_pu: number;
  round_pd: number;
  round_mu: number;
  round_md: number;
}

export interface ZReportMoneyFlow {
  type: number;
  name: string;
  sum_p: number;
  sum_m: number;
  round_pu: number;
  round_pd: number;
  round_mu: number;
  round_md: number;
}

export interface ZReportCashFlow {
  type: number;
  name: string;
  sum_p: number;
  sum_m: number;
  round_pu: number;
  round_pd: number;
  round_mu: number;
  round_md: number;
}

// Shift Status types
export enum ShiftStatus {
  UNKNOWN = -1,
  CLOSED = 0,
  OPEN = 1,
  BLOCKED = 2
}

export interface ShiftStatusInfo {
  edrpou: string;
  fisid: string;
  isFis: number;
  shift_status: ShiftStatus;
  shift_dt: string;
  online_status: number;
  sign_status: number;
  safe: number;
}

// Error handling
export interface CasaVchasnoError extends Error {
  code?: number;
  response?: CasaVchasnoResponse;
}

// Utility types for our application
export interface FiscalReceiptData {
  orderId: string;
  receiptType: TaskType;
  casaResponse: CasaVchasnoResponse;
  qrCode: string;
  documentCode: string;
  shiftId?: string;
  status: 'pending' | 'success' | 'failed';
  errorMessage?: string;
}

export interface FiscalShiftData {
  cashier: string;
  openedAt: string;
  closedAt?: string;
  status: 'open' | 'closed';
  zReportData?: ReceiptInfo;
  totalSales: number;
  totalReturns: number;
  receiptsCount: number;
}