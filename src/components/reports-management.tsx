'use client';

import { useState } from 'react';
import {
  FileText, Download, Calendar, Users, DollarSign,
  Receipt, Clock, Check, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchJSON } from '@/lib/utils';

interface ReportsManagementProps {
  organizationId: string;
}

export function ReportsManagement({ organizationId }: ReportsManagementProps) {
  const [selectedType, setSelectedType] = useState<'attendance' | 'payroll' | 'leaves' | 'expenses'>('attendance');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleExportCSV = async () => {
    if (!organizationId) return;
    setIsExporting(true);
    setMessage(null);

    try {
      const res = await fetchJSON<{
        success?: boolean;
        type?: string;
        count?: number;
        records?: Record<string, unknown>[];
      }>(
        `/api/reports?organizationId=${encodeURIComponent(organizationId)}&type=${selectedType}&month=${encodeURIComponent(selectedMonth)}`
      );

      if (!res?.success || !res.records || res.records.length === 0) {
        setMessage('No records found to export for the selected period.');
        setIsExporting(false);
        return;
      }

      // Convert JSON records to CSV
      const records = res.records;
      const headers = Object.keys(records[0]);
      const csvRows = [
        headers.join(','),
        ...records.map((row) =>
          headers
            .map((h) => {
              const val = row[h] == null ? '' : String(row[h]);
              return `"${val.replace(/"/g, '""')}"`;
            })
            .join(',')
        ),
      ];

      const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', csvContent);
      downloadAnchor.setAttribute('download', `SalaryBox_${selectedType}_${selectedMonth}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setMessage(`Exported ${records.length} records successfully!`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-500" />
            Reports & Data Downloads
          </h2>
          <p className="text-xs text-muted-foreground">
            Generate and export official CSV reports for Attendance, Payroll, Leaves, and Expenses
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-muted/60 border rounded-lg text-xs flex items-center gap-2">
          <Check className="h-4 w-4 text-teal-500" />
          <span>{message}</span>
        </div>
      )}

      {/* Report Types Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: 'attendance', label: 'Attendance Report', icon: Clock, color: 'text-emerald-500' },
          { id: 'payroll', label: 'Payroll Report', icon: DollarSign, color: 'text-blue-500' },
          { id: 'leaves', label: 'Leave Requests', icon: Calendar, color: 'text-purple-500' },
          { id: 'expenses', label: 'Expense Claims', icon: Receipt, color: 'text-orange-500' },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = selectedType === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedType(item.id as typeof selectedType)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 shadow-sm'
                  : 'bg-card hover:border-muted-foreground/30'
              }`}
            >
              <Icon className={`h-6 w-6 mb-2 ${item.color}`} />
              <p className="font-bold text-sm">{item.label}</p>
              <p className="text-[11px] text-muted-foreground">CSV Download</p>
            </button>
          );
        })}
      </div>

      {/* Filter and Download Card */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-teal-500" />
            Filter Period & Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Select Month (YYYY-MM)</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full h-10 px-3 border rounded-lg bg-background text-sm"
              />
            </div>

            <div className="sm:self-end">
              <Button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-medium h-10 px-6 w-full sm:w-auto"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download {selectedType.toUpperCase()} CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
