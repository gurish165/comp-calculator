"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  Percent, 
  TrendingUp,
  Calculator,
  BadgeDollarSign,
  DollarSignIcon,
  PiggyBank,
  Scale
} from "lucide-react";
import _ from 'lodash';

interface Inputs {
  baseSalary: number;
  equityPercentage: number;
  vestingYears: number;
  companyValue: number;
  exitMultiple: number;
  includeTax: boolean;
  nycTaxRate: number;
  nyTaxRate: number;
  federalTaxRate: number;
}

interface TaxCalculation {
  totalTax: number;
  netIncome: number;
  effectiveRate: number;
}

interface CapitalGainsTax {
  tax: number;
  net: number;
  effectiveRate: number;
}

interface YearlyCompensation {
  year: number;
  base: number;
  equity: number;
  grossTotal: number;
  tax: number;
  netTotal: number;
  effectiveTaxRate: number;
  cumulativeNetTotal: number;
}

interface ExitValue {
  gross: number;
  tax: number;
  net: number;
  effectiveRate: number;
}

const CompCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<Inputs>({
    baseSalary: 120000,
    equityPercentage: 0.1,
    vestingYears: 4,
    companyValue: 10000000,
    exitMultiple: 2,
    includeTax: true,
    nycTaxRate: 0.03876,
    nyTaxRate: 0.0685,
    federalTaxRate: 0.35
  });

  const formatNumberWithCommas = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(value);
  };

  const parseFormattedNumber = (value: string): number => {
    // Remove all non-digit characters except decimal point
    const cleanValue = value.replace(/[^\d.-]/g, '');
    const parsedValue = parseFloat(cleanValue);
    return isNaN(parsedValue) ? 0 : parsedValue;
  };

  const [yearlyComp, setYearlyComp] = useState<YearlyCompensation[]>([]);
  const [exitValue, setExitValue] = useState<ExitValue>({
    gross: 0,
    tax: 0,
    net: 0,
    effectiveRate: 0
  });
  

  const calculateIncomeTax = (income: number): TaxCalculation => {
    if (!inputs.includeTax) {
      return {
        totalTax: 0,
        netIncome: income,
        effectiveRate: 0
      };
    }

    const federalTax = income * inputs.federalTaxRate;
    const nyTax = income * inputs.nyTaxRate;
    const nycTax = income * inputs.nycTaxRate;
    const totalTax = federalTax + nyTax + nycTax;

    return {
      totalTax: totalTax || 0,
      netIncome: (income - totalTax) || 0,
      effectiveRate: income > 0 ? ((totalTax / income) * 100) || 0 : 0
    };
  };

  const calculateCapitalGainsTax = (gain: number): CapitalGainsTax => {
    if (!inputs.includeTax) {
      return {
        tax: 0,
        net: gain,
        effectiveRate: 0
      };
    }
    
    // Federal long-term capital gains (simplified)
    const federalRate = gain > 500000 ? 0.20 : 0.15;
    const nyRate = 0.0882; // NY state capital gains rate
    const totalRate = federalRate + nyRate;
    
    const tax = gain * totalRate;
    return {
      tax: tax || 0,
      net: (gain - tax) || 0,
      effectiveRate: (totalRate * 100) || 0
    };
  };

  useEffect(() => {
    // Calculate equity value
    const equityValue = inputs.companyValue * (inputs.equityPercentage);
    console.log("equity percentage: " + inputs.equityPercentage)
    const yearlyEquity = equityValue / inputs.vestingYears;
    
    // Calculate yearly compensation for 10 years
    const yearlySummary: YearlyCompensation[] = _.range(1, 11).map(year => {
      const hasEquity = year <= inputs.vestingYears;
      const grossTotal = inputs.baseSalary + (hasEquity ? yearlyEquity : 0);
      const taxes = calculateIncomeTax(grossTotal);
      
      return {
        year,
        base: inputs.baseSalary,
        equity: hasEquity ? yearlyEquity : 0,
        grossTotal,
        tax: taxes.totalTax,
        netTotal: taxes.netIncome,
        effectiveTaxRate: taxes.effectiveRate,
        cumulativeNetTotal: 0 // Will be calculated after
      };
    });

    // Calculate cumulative totals
    let runningTotal = 0;
    yearlySummary.forEach(year => {
      runningTotal += year.netTotal;
      year.cumulativeNetTotal = runningTotal;
    });

    // Calculate exit value with capital gains tax
    const grossExit = equityValue * inputs.exitMultiple;
    console.log("equity: " + equityValue + " gross: " + grossExit + " comp value: " + inputs.companyValue)
    const exitTaxes = calculateCapitalGainsTax(grossExit);

    setYearlyComp(yearlySummary);
    setExitValue({
      gross: grossExit,
      tax: exitTaxes.tax,
      net: exitTaxes.net,
      effectiveRate: exitTaxes.effectiveRate
    });
  }, [inputs]);

  const handleInputChange = (field: keyof Inputs, value: string | boolean): void => {
    if (field === 'includeTax') {
      setInputs(prev => ({
        ...prev,
        includeTax: value as boolean
      }));
    } else {
      const numericValue = typeof value === 'string' ? parseFormattedNumber(value) : Number(value);
      setInputs(prev => ({
        ...prev,
        [field]: numericValue
      }));
    }
  };

  const InputField: React.FC<{
    label: string;
    value: number;
    onChange: (value: string) => void;
    icon: React.ReactNode;
    step?: string;
    min?: string;
    max?: string;
    percentage?: boolean;
  }> = ({ label, value, onChange, icon, percentage }) => {
    // Use a ref to track first render
    const isFirstRender = useRef(true);
    const [localValue, setLocalValue] = useState(() => 
      percentage ? (value * 100).toString() : formatNumberWithCommas(value)
    );
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      // Skip the first render to avoid hydration mismatch
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      if (!isFocused) {
        setLocalValue(percentage ? (value * 100).toString() : formatNumberWithCommas(value));
      }
    }, [value, percentage, isFocused]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      // Allow only numbers, decimal point, and backspace
      if (!/^[\d,]*\.?\d*$/.test(newValue) && newValue !== '') return;
      
      setLocalValue(newValue);
    };

    const handleBlur = () => {
      setIsFocused(false);
      const parsedValue = parseFormattedNumber(localValue);
      const finalValue = percentage ? parsedValue / 100 : parsedValue;
      onChange(finalValue.toString());
    };

    const handleFocus = () => {
      setIsFocused(true);
      // When focused, show raw number without commas
      setLocalValue(localValue.replace(/,/g, ''));
    };

    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {label}
        </Label>
        <div className="relative">
          <Input
            type="text"
            value={localValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            className="pl-8 h-9 dark:bg-gray-950 dark:border-gray-800"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {percentage ? "%" : "$"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4 dark:bg-gray-950 bg-background text-foreground">
      <Card className="border-none shadow-lg dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
            <Calculator className="h-6 w-6" />
            Compensation Calculator
            <span className="text-sm font-normal text-muted-foreground ml-2">(NY Tax Edition)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InputField
              label="Base Salary"
              value={inputs.baseSalary}
              onChange={(v) => handleInputChange('baseSalary', v)}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <InputField
              label="Equity Percentage"
              value={inputs.equityPercentage}
              onChange={(v) => handleInputChange('equityPercentage', v)}
              icon={<Percent className="h-4 w-4" />}
              step="0.01"
              percentage={true}
            />
            <InputField
              label="Vesting Years"
              value={inputs.vestingYears}
              onChange={(v) => handleInputChange('vestingYears', v)}
              icon={<Calendar className="h-4 w-4" />}
              min="1"
              max="10"
            />
            <InputField
              label="Company Value"
              value={inputs.companyValue}
              onChange={(v) => handleInputChange('companyValue', v)}
              icon={<Building2 className="h-4 w-4" />}
            />
            <InputField
              label="Exit Multiple"
              value={inputs.exitMultiple}
              onChange={(v) => handleInputChange('exitMultiple', v)}
              icon={<TrendingUp className="h-4 w-4" />}
              step="0.1"
            />
          </div>

          <Separator className="my-6" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InputField
              label="Federal Tax Rate"
              value={inputs.federalTaxRate}
              onChange={(v) => handleInputChange('federalTaxRate', v)}
              icon={<BadgeDollarSign className="h-4 w-4" />}
              step="0.1"
              percentage={true}
            />
            <InputField
              label="NY State Tax Rate"
              value={inputs.nyTaxRate}
              onChange={(v) => handleInputChange('nyTaxRate', v)}
              icon={<PiggyBank className="h-4 w-4" />}
              step="0.1"
              percentage={true}
            />
            <InputField
              label="NYC Tax Rate"
              value={inputs.nycTaxRate}
              onChange={(v) => handleInputChange('nycTaxRate', v)}
              icon={<Scale className="h-4 w-4" />}
              step="0.1"
              percentage={true}
            />
          </div>

          <div className="flex items-center space-x-2 mt-6">
            <Switch
              checked={inputs.includeTax}
              onCheckedChange={(checked) => handleInputChange('includeTax', checked)}
            />
            <Label className="text-sm font-medium text-muted-foreground">Include Tax Calculations</Label>
          </div>

          <Separator className="my-6" />

          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSignIcon className="h-5 w-5" />
              Exit Value (Capital Gains)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-secondary/20 border-none dark:bg-gray-800/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Gross</p>
                  <p className="text-2xl font-bold">${formatNumberWithCommas(exitValue.gross || 0)}</p>
                </CardContent>
              </Card>
              <Card className="bg-secondary/20 border-none">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Tax ({(exitValue.effectiveRate || 0).toFixed(1)}%)
                  </p>
                  <p className="text-2xl font-bold text-red-500">
                    -${formatNumberWithCommas(exitValue.tax || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-secondary/20 border-none">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Net</p>
                  <p className="text-2xl font-bold text-green-500">
                    ${formatNumberWithCommas(exitValue.net || 0)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator className="my-6" />

          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Yearly Compensation
            </h3>
            <div className="overflow-x-auto rounded-lg border dark:border-gray-800 bg-secondary/20 dark:bg-gray-800/50">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Year</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Base</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Equity</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Gross Total</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Tax</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Net Total</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Cumulative Net</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Effective Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyComp.map((year) => (
                    <tr key={year.year} className="border-b border-border/50 last:border-0">
                      <td className="p-3">Year {year.year}</td>
                      <td className="p-3">${formatNumberWithCommas(year.base)}</td>
                      <td className="p-3">${formatNumberWithCommas(year.equity)}</td>
                      <td className="p-3">${formatNumberWithCommas(year.grossTotal)}</td>
                      <td className="p-3 text-red-500">-${formatNumberWithCommas(year.tax)}</td>
                      <td className="p-3 text-green-500">${formatNumberWithCommas(year.netTotal)}</td>
                      <td className="p-3 font-semibold">${formatNumberWithCommas(year.cumulativeNetTotal)}</td>
                      <td className="p-3">{(year.effectiveTaxRate || 0).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompCalculator;