"use client"

import React, { useState } from "react"
import { Button } from "@/app/components/shared/ui/button"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/app/components/shared/ui/dialog"
import { Badge } from "@/app/components/shared/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { ScrollArea } from "@/app/components/shared/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/shared/ui/table"
import { FileText, Download, Printer, DollarSign, Receipt, RotateCcw, TrendingUp, Calendar, User } from "lucide-react"
import { format } from "date-fns"
import { formatCurrency } from "@/app/lib/utils"
import { ZReportReceiptInfo, ZReportSummary, ZReportTaxDetail, ZReportPaymentMethod } from '@/app/types/casa-vchasno'

// Z-Report data type
export type ZReportData = {
  receipt: ZReportReceiptInfo;
  summary: ZReportSummary;
  taxes?: ZReportTaxDetail[];
  pays?: ZReportPaymentMethod[];
  cashier: string;
  dt: string;
  fisid: string;
  doccode: string;
  safe?: number;
}

interface ZReportViewerProps {
  isOpen: boolean
  onClose: () => void
  zReportData: ZReportData | null
  shiftData?: unknown
}

export function ZReportViewer({ isOpen, onClose, zReportData, shiftData }: ZReportViewerProps) {
  const [isPrinting, setIsPrinting] = useState(false)

  if (!zReportData) return null

  const receiptInfo = zReportData.receipt as ZReportReceiptInfo
  const summary = zReportData.summary as ZReportSummary
  const taxes = (zReportData.taxes || []) as ZReportTaxDetail[]
  const payments = (zReportData.pays || []) as ZReportPaymentMethod[]

  const handlePrint = () => {
    setIsPrinting(true)
    window.print()
    setTimeout(() => setIsPrinting(false), 1000)
  }

  const handleDownload = () => {
    const reportData = {
      shiftInfo: {
        cashier: zReportData.cashier,
        dateTime: zReportData.dt,
        deviceId: zReportData.fisid,
        documentCode: zReportData.doccode,
      },
      summary: summary,
      receipts: receiptInfo,
      taxes: taxes,
      payments: payments,
      shiftData: shiftData
    }

    const dataStr = JSON.stringify(reportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `z-report-${zReportData.doccode || 'unknown'}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Z-Report Details
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="h-8 px-3"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={isPrinting}
                className="h-8 px-3"
              >
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Header Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shift Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Cashier</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{zReportData.cashier}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Date & Time</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {zReportData.dt ? format(
                        new Date(
                          zReportData.dt.replace(
                            /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
                            '$1-$2-$3T$4:$5:$6'
                          )
                        ),
                        "MMM d, yyyy HH:mm:ss"
                      ) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Document Code</span>
                    </div>
                    <p className="text-sm font-mono text-gray-600 dark:text-gray-400">{zReportData.doccode}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Fiscal Device ID</span>
                    </div>
                    <p className="text-sm font-mono text-gray-600 dark:text-gray-400">{zReportData.fisid}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Statistics */}
            {summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Shift Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">Sales</span>
                      </div>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(summary.base_p || 0)}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Tax: {formatCurrency(summary.taxex_p || 0)}
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <RotateCcw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Returns</span>
                      </div>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(summary.base_m || 0)}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Tax: {formatCurrency(summary.taxex_m || 0)}
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Net Sales</span>
                      </div>
                      <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                        {formatCurrency((summary.base_p || 0) - (summary.base_m || 0))}
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        Discounts: {formatCurrency((summary.disc_p || 0) - (summary.disc_m || 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Receipt Counters */}
            {receiptInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Receipt Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {receiptInfo.count_p || 0}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Sale Receipts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {receiptInfo.count_m || 0}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Return Receipts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                        {receiptInfo.count_14 || 0}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Service Receipts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {(receiptInfo.count_p || 0) + (receiptInfo.count_m || 0) + (receiptInfo.count_14 || 0)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Receipts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tax Details */}
            {taxes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tax Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tax Group</TableHead>
                        <TableHead>Tax Name</TableHead>
                        <TableHead className="text-right">Sales Base</TableHead>
                        <TableHead className="text-right">Returns Base</TableHead>
                        <TableHead className="text-right">Tax Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taxes.map((tax, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant="outline">{tax.gr_code}</Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{tax.tax_fname}</p>
                              <p className="text-sm text-gray-500">{tax.tax_percent}%</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(tax.base_sum_p || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(tax.base_sum_m || 0)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency((tax.tax_sum_p || 0) - (tax.tax_sum_m || 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Payment Methods */}
            {payments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment Type</TableHead>
                        <TableHead className="text-right">Sales</TableHead>
                        <TableHead className="text-right">Returns</TableHead>
                        <TableHead className="text-right">Net Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {payment.type === 0 && <DollarSign className="h-4 w-4 text-green-600" />}
                              {payment.type === 1 && <Badge className="h-4 w-4 text-blue-600" />}
                              {payment.type === 2 && <Receipt className="h-4 w-4 text-purple-600" />}
                              <span className="font-medium">{payment.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-green-600 dark:text-green-400">
                            {formatCurrency(payment.sum_p || 0)}
                          </TableCell>
                          <TableCell className="text-right text-blue-600 dark:text-blue-400">
                            {formatCurrency(payment.sum_m || 0)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency((payment.sum_p || 0) - (payment.sum_m || 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Safe Amount */}
            {zReportData.safe !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle>Cash Register Safe</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium">Final Safe Amount:</span>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(zReportData.safe)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}