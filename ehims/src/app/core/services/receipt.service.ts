import { Injectable, inject } from '@angular/core';
import { ElectronService } from './electron.service';

export interface ReceiptPrintRequest {
  orderId: number;
  orderNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  discount?: number;
  tax: number;
  total: number;
  paymentMethod: string;
  isCredit?: boolean;
  splitPayment?: {
    cash: number;
    card: number;
    transfer: number;
  };
  customerName?: string;
  tableNumber?: string;
  notes?: string;
}

export interface PaymentReceiptPrintRequest {
  paymentId: number;
  customerName: string;
  amount: number;
  paymentMethod: string;
  remainingBalance: number;
  orderNumber?: string;
  reference?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class ReceiptService {
  private electronService = inject(ElectronService);

  async printReceipt(
    data: ReceiptPrintRequest,
  ): Promise<{ success: boolean; error?: string }> {
    return this.electronService.invoke('receipt:print', data);
  }

  async reprintReceipt(
    data: ReceiptPrintRequest,
  ): Promise<{ success: boolean; error?: string }> {
    return this.electronService.invoke('receipt:print', {
      ...data,
      reprint: true,
    });
  }

  async printPaymentReceipt(
    data: PaymentReceiptPrintRequest,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    return this.electronService.invoke('receipt:payment-print', data);
  }

  async testPrint(
    printerName?: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.electronService.invoke('receipt:test-print', { printerName });
  }

  formatReceiptContent(data: ReceiptPrintRequest, settings: any): string {
    const lineWidth = settings?.line_width || 32;
    const line = '='.repeat(lineWidth);
    const dash = '-'.repeat(lineWidth);

    let receipt = `${line}\n`;
    receipt += this.centerText('RECEIPT', lineWidth) + '\n';
    receipt += `Order #: ${data.orderNumber}\n`;
    receipt += `Date: ${new Date().toLocaleString()}\n`;

    if (data.customerName) {
      receipt += `Customer: ${data.customerName}\n`;
    }
    if (data.tableNumber) {
      receipt += `Table: ${data.tableNumber}\n`;
    }

    receipt += `${line}\n\n`;
    receipt += `Item                    Qty    Price   Total\n`;
    receipt += `${dash}\n`;

    for (const item of data.items) {
      const itemLine = this.formatItemLine(item, lineWidth - 4);
      receipt += itemLine + '\n';
    }

    receipt += `${dash}\n`;
    receipt +=
      this.rightAlignText(`Subtotal: ₦${data.subtotal.toFixed(2)}`, lineWidth) +
      '\n';

    if (data.discount && data.discount > 0) {
      receipt +=
        this.rightAlignText(
          `Discount: -₦${data.discount.toFixed(2)}`,
          lineWidth,
        ) + '\n';
    }

    receipt +=
      this.rightAlignText(`Tax: ₦${data.tax.toFixed(2)}`, lineWidth) + '\n';
    receipt += `${line}\n`;
    receipt +=
      this.rightAlignText(`TOTAL: ₦${data.total.toFixed(2)}`, lineWidth) + '\n';
    receipt += `${line}\n\n`;

    receipt +=
      this.centerText(`Payment: ${data.paymentMethod}`, lineWidth) + '\n';

    if (data.notes) {
      receipt += `\nNotes: ${data.notes}\n`;
    }

    receipt += `\n${this.centerText('Thank you for your purchase!', lineWidth)}\n`;
    receipt += `${this.centerText('Visit us again', lineWidth)}\n`;
    receipt += `${line}\n`;

    return receipt;
  }

  private formatItemLine(item: any, width: number): string {
    const name = item.name.substring(0, 15).padEnd(15);
    const qty = item.quantity.toString().padStart(4);
    const price = `₦${item.unitPrice.toFixed(0)}`.padStart(7);
    const total = `₦${item.lineTotal.toFixed(0)}`.padStart(7);
    return `${name} ${qty}  ${price}  ${total}`;
  }

  private centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  private rightAlignText(text: string, width: number): string {
    const padding = Math.max(0, width - text.length);
    return ' '.repeat(padding) + text;
  }
}
