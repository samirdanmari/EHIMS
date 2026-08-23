import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'appCurrency',
  standalone: true
})
export class CurrencyPipe implements PipeTransform {
  transform(value: number | string | null | undefined, symbol: string = '₦'): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const numericValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numericValue)) {
      return '';
    }

    const formattedValue = numericValue.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return `${symbol}${formattedValue}`;
  }
}
